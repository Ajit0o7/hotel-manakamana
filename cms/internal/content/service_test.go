package content

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

// memRepo is a minimal in-memory Repository for service tests. The real
// path/uniqueness rules live in Postgres and are covered by the postgres
// package's integration tests.
type memRepo struct {
	entries map[uuid.UUID]*Entry
}

func newMemRepo() *memRepo { return &memRepo{entries: map[uuid.UUID]*Entry{}} }

func (r *memRepo) path(e *Entry) string {
	if e.ParentID == nil {
		return e.Slug
	}
	return r.entries[*e.ParentID].Path + "/" + e.Slug
}

func (r *memRepo) Create(_ context.Context, e *Entry) error {
	e.ID, e.Path = uuid.New(), r.path(e)
	for _, o := range r.entries {
		if o.Type == e.Type && o.Path == e.Path {
			return apperr.Conflict("slug taken")
		}
	}
	e.CreatedAt, e.UpdatedAt = time.Now(), time.Now()
	cp := *e
	r.entries[e.ID] = &cp
	return nil
}

func (r *memRepo) Update(_ context.Context, e *Entry) error {
	if _, ok := r.entries[e.ID]; !ok {
		return apperr.NotFound("entry not found")
	}
	e.Path = r.path(e)
	cp := *e
	r.entries[e.ID] = &cp
	return nil
}

func (r *memRepo) Delete(_ context.Context, _ string, id uuid.UUID) error {
	delete(r.entries, id)
	return nil
}

func (r *memRepo) Get(_ context.Context, typ string, id uuid.UUID) (*Entry, error) {
	if e, ok := r.entries[id]; ok && e.Type == typ {
		cp := *e
		return &cp, nil
	}
	return nil, apperr.NotFound("entry not found")
}

func (r *memRepo) GetByPath(_ context.Context, typ, path string) (*Entry, error) {
	for _, e := range r.entries {
		if e.Type == typ && e.Path == path {
			cp := *e
			return &cp, nil
		}
	}
	return nil, apperr.NotFound("entry not found")
}

func (r *memRepo) List(_ context.Context, f ListFilter) ([]*Entry, int, error) {
	var out []*Entry
	for _, e := range r.entries {
		if e.Type == f.Type && (f.LiveAt == nil || e.IsLive(*f.LiveAt)) {
			out = append(out, e)
		}
	}
	return out, len(out), nil
}

type memMedia map[uuid.UUID]MediaRef

func (m memMedia) ResolveMedia(_ context.Context, ids []uuid.UUID) (map[uuid.UUID]MediaRef, error) {
	out := map[uuid.UUID]MediaRef{}
	for _, id := range ids {
		if ref, ok := m[id]; ok {
			out[id] = ref
		}
	}
	return out, nil
}

type stripScripts struct{}

func (stripScripts) HTML(s string) string { return strings.ReplaceAll(s, "<script>", "") }

var testNow = time.Date(2026, 10, 7, 12, 0, 0, 0, time.UTC)

func newTestService(t *testing.T, media memMedia) (*Service, *memRepo) {
	t.Helper()
	types := NewRegistry()
	types.MustRegister(PageType)
	types.MustRegister(PostType)
	repo := newMemRepo()
	return NewService(Deps{
		Repo: repo, Types: types, Media: media, Sanitizer: stripScripts{},
		Analyzer: seo.NewAnalyzer("www.hotelmanthali.com"),
		SiteURL:  "https://www.hotelmanthali.com/", Now: func() time.Time { return testNow },
	}), repo
}

func fieldErrors(t *testing.T, err error) map[string]string {
	t.Helper()
	e, ok := apperr.As(err)
	if !ok || e.Code != apperr.CodeInvalid {
		t.Fatalf("want validation error, got %v", err)
	}
	return e.Fields
}

func TestCreateDefaultsAndScores(t *testing.T) {
	svc, _ := newTestService(t, nil)
	ctx := context.Background()
	author := uuid.New()

	e, err := svc.Create(ctx, "page", Input{
		Title:   "  About Us ",
		Content: "<p>Hello<script>x</p>",
		SEO:     seo.Meta{FocusKeyword: "  family   hotel ", MetaDescription: " Family run. "},
	}, &author)
	if err != nil {
		t.Fatal(err)
	}
	if e.Title != "About Us" || e.Slug != "about-us" || e.Status != StatusDraft || e.PublishedAt != nil {
		t.Errorf("entry = %+v", e)
	}
	if strings.Contains(e.Content, "<script>") {
		t.Error("content was not sanitized")
	}
	if e.SEO.FocusKeyword != "family hotel" || e.SEO.MetaDescription != "Family run." {
		t.Errorf("seo not normalized: %+v", e.SEO)
	}
	if e.SEO.SEOScore == nil || *e.SEO.SEOScore <= 0 {
		t.Error("SEO score was not computed")
	}
	if e.AuthorID == nil || *e.AuthorID != author {
		t.Error("author not recorded")
	}
}

func TestCreateValidation(t *testing.T) {
	svc, _ := newTestService(t, nil)
	ctx := context.Background()

	_, err := svc.Create(ctx, "post", Input{
		Slug:     "Bad Slug",
		Status:   "live",
		ParentID: ptr(uuid.New()),
		Fields:   map[string]any{"colour": "red"},
		SEO:      seo.Meta{CanonicalURL: "not-a-url"},
	}, nil)
	errs := fieldErrors(t, err)
	for _, k := range []string{"title", "slug", "status", "parent_id", "fields.colour", "seo.canonical_url"} {
		if errs[k] == "" {
			t.Errorf("missing error for %s; got %v", k, errs)
		}
	}

	_, err = svc.Create(ctx, "page", Input{Title: "X", Template: "nope"}, nil)
	if fieldErrors(t, err)["template"] == "" {
		t.Error("unknown template accepted")
	}

	if _, err := svc.Create(ctx, "room", Input{Title: "X"}, nil); !apperr.Is(err, apperr.CodeNotFound) {
		t.Errorf("unknown type: err = %v", err)
	}
}

func TestMediaReferencesMustExist(t *testing.T) {
	img := uuid.New()
	svc, _ := newTestService(t, memMedia{img: {ID: img, URL: "https://cdn/x.jpg"}})
	ctx := context.Background()

	_, err := svc.Create(ctx, "page", Input{
		Title: "Rooms", FeaturedMediaID: ptr(uuid.New()),
		SEO:    seo.Meta{OGImageID: ptr(uuid.New())},
		Fields: map[string]any{"sections": []any{map[string]any{"layout": "page_hero", "photo": uuid.NewString()}}},
	}, nil)
	errs := fieldErrors(t, err)
	for _, k := range []string{"featured_media_id", "seo.og_image_id", "fields.sections"} {
		if errs[k] != "media item not found" {
			t.Errorf("%s: got %q", k, errs[k])
		}
	}

	if _, err := svc.Create(ctx, "page", Input{Title: "Rooms", FeaturedMediaID: &img}, nil); err != nil {
		t.Fatal(err)
	}
}

func TestHierarchy(t *testing.T) {
	svc, _ := newTestService(t, nil)
	ctx := context.Background()

	about, _ := svc.Create(ctx, "page", Input{Title: "About"}, nil)
	team, err := svc.Create(ctx, "page", Input{Title: "Team", ParentID: &about.ID}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if team.Path != "about/team" {
		t.Errorf("path = %q", team.Path)
	}

	// Moving a page below its own child would create a cycle.
	_, err = svc.Update(ctx, "page", about.ID, Input{Title: "About", ParentID: &team.ID})
	if fieldErrors(t, err)["parent_id"] == "" {
		t.Error("cycle accepted")
	}
	_, err = svc.Update(ctx, "page", about.ID, Input{Title: "About", ParentID: &about.ID})
	if fieldErrors(t, err)["parent_id"] == "" {
		t.Error("self-parent accepted")
	}
	// Posts are flat.
	post, _ := svc.Create(ctx, "post", Input{Title: "News"}, nil)
	_, err = svc.Create(ctx, "post", Input{Title: "Child", ParentID: &post.ID}, nil)
	if fieldErrors(t, err)["parent_id"] == "" {
		t.Error("parent accepted on a flat type")
	}
}

func TestPublishingAndScheduling(t *testing.T) {
	svc, _ := newTestService(t, nil)
	ctx := context.Background()

	e, _ := svc.Create(ctx, "post", Input{Title: "Dashain offer"}, nil)
	if _, err := svc.GetLiveByPath(ctx, "post", "dashain-offer"); !apperr.Is(err, apperr.CodeNotFound) {
		t.Error("draft visible publicly")
	}

	future := testNow.Add(48 * time.Hour)
	e, err := svc.Publish(ctx, "post", e.ID, &future)
	if err != nil {
		t.Fatal(err)
	}
	if e.Status != StatusPublished || !e.PublishedAt.Equal(future) {
		t.Errorf("entry = %+v", e)
	}
	if _, err := svc.GetLiveByPath(ctx, "post", "dashain-offer"); !apperr.Is(err, apperr.CodeNotFound) {
		t.Error("scheduled entry visible before its time")
	}

	past := testNow.Add(-time.Hour)
	e, _ = svc.Publish(ctx, "post", e.ID, &past)
	if _, err := svc.GetLiveByPath(ctx, "post", "/dashain-offer/"); err != nil {
		t.Errorf("published entry not visible: %v", err)
	}

	// Saving again without a date keeps the original publish date.
	e, _ = svc.Update(ctx, "post", e.ID, Input{Title: "Dashain offer", Status: StatusPublished})
	if !e.PublishedAt.Equal(past) {
		t.Errorf("publish date changed to %v", e.PublishedAt)
	}

	e, _ = svc.Unpublish(ctx, "post", e.ID)
	if e.Status != StatusDraft {
		t.Errorf("status = %s", e.Status)
	}

	// Publishing a new entry directly stamps "now".
	e, _ = svc.Create(ctx, "post", Input{Title: "Now", Status: StatusPublished}, nil)
	if e.PublishedAt == nil || !e.PublishedAt.Equal(testNow) {
		t.Errorf("published_at = %v", e.PublishedAt)
	}
}

func TestPresentHead(t *testing.T) {
	img := uuid.New()
	w, h := 4000, 3000
	media := memMedia{img: {
		ID: img, URL: "https://cdn/orig.jpg", AltText: "Terrace", Width: &w, Height: &h,
		Sizes: map[string]MediaSize{"og": {URL: "https://cdn/og.jpg", Width: 1200, Height: 630}},
	}}
	svc, _ := newTestService(t, media)
	ctx := context.Background()

	home, _ := svc.Create(ctx, "page", Input{
		Title: "Home", Excerpt: "Stay by the airport.", Status: StatusPublished, FeaturedMediaID: &img,
	}, nil)
	post, _ := svc.Create(ctx, "post", Input{
		Title: "Lukla tips", Status: StatusPublished,
		SEO: seo.Meta{MetaTitle: "Lukla flight tips", OGImageURL: "https://img.example/card.png",
			CanonicalURL: "https://example.com/original", NoIndex: true},
	}, nil)

	out, err := svc.Present(ctx, home, post)
	if err != nil {
		t.Fatal(err)
	}
	hp := out[0].Head
	if out[0].URL != "/" || hp.Canonical != "https://www.hotelmanthali.com/" || hp.Title != "Home" ||
		hp.Description != "Stay by the airport." || hp.OGType != "website" || hp.Robots != "index, follow" {
		t.Errorf("home head = %+v (url %q)", hp, out[0].URL)
	}
	if hp.OGImage != "https://cdn/og.jpg" || hp.OGImageWidth != 1200 || hp.TwitterCard != "summary_large_image" {
		t.Errorf("home og image = %+v", hp)
	}
	if out[0].FeaturedMedia == nil || out[0].FeaturedMedia.URL != "https://cdn/orig.jpg" {
		t.Errorf("featured media = %+v", out[0].FeaturedMedia)
	}

	ph := out[1].Head
	if out[1].URL != "/guides/lukla-tips" || ph.Title != "Lukla flight tips" || ph.OGTitle != "Lukla flight tips" ||
		ph.Canonical != "https://example.com/original" || ph.OGURL != "https://www.hotelmanthali.com/guides/lukla-tips" ||
		ph.Robots != "noindex, follow" || ph.OGImage != "https://img.example/card.png" || ph.OGType != "article" {
		t.Errorf("post head = %+v", ph)
	}
}

func ptr[T any](v T) *T { return &v }

func TestFieldMediaIsCheckedAndPresented(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	svc, _ := newTestService(t, memMedia{a: {ID: a, URL: "https://cdn/a.jpg"}, b: {ID: b, URL: "https://cdn/b.jpg"}})
	svc.Types.MustRegister(RoomType)
	ctx := context.Background()

	_, err := svc.Create(ctx, "page", Input{Title: "Gallery", Template: "gallery", Fields: map[string]any{
		"sections": []any{map[string]any{"layout": "gallery", "photos": []any{map[string]any{"photo": uuid.NewString(), "category": "food"}}}},
	}}, nil)
	if fieldErrors(t, err)["fields.sections"] != "media item not found" {
		t.Errorf("missing table photo not reported: %v", err)
	}

	room, err := svc.Create(ctx, "room", Input{Title: "Deluxe", Status: StatusPublished, Fields: map[string]any{
		"price_npr": 2500.0, "max_guests": 2.0, "photos": []any{a.String(), b.String()},
	}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	out, err := svc.Present(ctx, room)
	if err != nil {
		t.Fatal(err)
	}
	if len(out[0].Media) != 2 || out[0].Media[b.String()].URL != "https://cdn/b.jpg" || out[0].URL != "/rooms/deluxe" {
		t.Errorf("presented room = %+v", out[0])
	}
}

func TestSectionsAreSanitizedAndAnalyzed(t *testing.T) {
	svc, _ := newTestService(t, memMedia{})
	e, err := svc.Create(context.Background(), "page", Input{Title: "About us", Fields: map[string]any{"sections": []any{
		map[string]any{"layout": "text", "heading": "Our *family*", "content": "<p>Run by one family since 2015.</p><script>alert(1)</script>"},
	}}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	section := e.Fields["sections"].([]map[string]any)[0]
	if c := section["content"].(string); strings.Contains(c, "<script") || !strings.Contains(c, "since 2015") {
		t.Errorf("content = %q", c)
	}
	rep, err := svc.Analyze(context.Background(), "page", e.ID)
	if err != nil {
		t.Fatal(err)
	}
	if rep.Stats.WordCount < 8 {
		t.Errorf("section text not analyzed: %+v", rep.Stats)
	}
}
