package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/testdb"
)

func page(slug string, parent *uuid.UUID) *content.Entry {
	return &content.Entry{Type: "page", Title: slug, Slug: slug, Status: content.StatusDraft, ParentID: parent}
}

func TestRepositoryRoundTrip(t *testing.T) {
	pool := testdb.New(t)
	repo := postgres.New(pool)
	ctx := context.Background()

	score := 72
	pub := time.Date(2026, 9, 1, 8, 0, 0, 0, time.UTC)
	e := &content.Entry{
		Type: "post", Title: "Dashain offer", Slug: "dashain-offer", Content: "<p>20% off</p>",
		Status: content.StatusPublished, PublishedAt: &pub,
		Fields: map[string]any{"category": "offer", "tags": []string{"festival"}},
		SEO: seo.Meta{MetaTitle: "Dashain deal", FocusKeyword: "dashain offer", NoIndex: true,
			CanonicalURL: "https://www.hotelmanthali.com/blog/dashain-offer", SEOScore: &score},
	}
	if err := repo.Create(ctx, e); err != nil {
		t.Fatal(err)
	}
	if e.ID == uuid.Nil || e.Path != "dashain-offer" || e.CreatedAt.IsZero() {
		t.Errorf("create did not fill generated columns: %+v", e)
	}

	got, err := repo.Get(ctx, "post", e.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != e.Title || got.Fields["category"] != "offer" || !got.PublishedAt.Equal(pub) ||
		got.SEO.MetaTitle != "Dashain deal" || !got.SEO.NoIndex || got.SEO.SEOScore == nil || *got.SEO.SEOScore != 72 ||
		got.SEO.ReadabilityScore != nil {
		t.Errorf("round trip mismatch: %+v", got)
	}
	if _, err := repo.Get(ctx, "page", e.ID); !apperr.Is(err, apperr.CodeNotFound) {
		t.Error("entry found under the wrong type")
	}

	got.SEO.MetaTitle = "Updated"
	got.Title = "Dashain offer 2026"
	before := got.UpdatedAt
	if err := repo.Update(ctx, got); err != nil {
		t.Fatal(err)
	}
	again, _ := repo.Get(ctx, "post", e.ID)
	if again.SEO.MetaTitle != "Updated" || again.Title != "Dashain offer 2026" || !again.UpdatedAt.After(before) {
		t.Errorf("update not saved: %+v", again)
	}

	if err := repo.Delete(ctx, "post", e.ID); err != nil {
		t.Fatal(err)
	}
	var seoRows int
	pool.QueryRow(ctx, "select count(*) from cms.seo_data").Scan(&seoRows)
	if seoRows != 0 {
		t.Error("SEO row not deleted with its entry")
	}
	if err := repo.Delete(ctx, "post", e.ID); !apperr.Is(err, apperr.CodeNotFound) {
		t.Errorf("second delete: %v", err)
	}
}

func TestRepositoryHierarchy(t *testing.T) {
	pool := testdb.New(t)
	repo := postgres.New(pool)
	ctx := context.Background()

	about := page("about", nil)
	must(t, repo.Create(ctx, about))
	team := page("team", &about.ID)
	must(t, repo.Create(ctx, team))
	chef := page("chef", &team.ID)
	must(t, repo.Create(ctx, chef))
	if chef.Path != "about/team/chef" {
		t.Fatalf("path = %q", chef.Path)
	}

	// Renaming an ancestor rewrites every descendant's path.
	about.Slug = "about-us"
	must(t, repo.Update(ctx, about))
	got, err := repo.GetByPath(ctx, "page", "about-us/team/chef")
	if err != nil || got.ID != chef.ID {
		t.Fatalf("GetByPath after rename: %+v, %v", got, err)
	}

	// The same slug may be reused under a different parent, but not twice
	// under the same one.
	must(t, repo.Create(ctx, page("team", nil)))
	err = repo.Create(ctx, page("team", &about.ID))
	if e, ok := apperr.As(err); !ok || e.Code != apperr.CodeConflict || e.Fields["slug"] == "" {
		t.Errorf("duplicate sibling slug: %v", err)
	}

	// The database refuses cycles even if the service check were bypassed.
	about.ParentID = &chef.ID
	if err := repo.Update(ctx, about); !apperr.Is(err, apperr.CodeInvalid) {
		t.Errorf("cycle: err = %v", err)
	}
	// ...and parents of another type.
	post := &content.Entry{Type: "post", Title: "p", Slug: "p", Status: content.StatusDraft}
	must(t, repo.Create(ctx, post))
	if err := repo.Create(ctx, page("x", &post.ID)); !apperr.Is(err, apperr.CodeInvalid) {
		t.Errorf("cross-type parent: err = %v", err)
	}
	if err := repo.Create(ctx, page("y", ptr(uuid.New()))); !apperr.Is(err, apperr.CodeInvalid) {
		t.Errorf("missing parent: err = %v", err)
	}

	// Pages with children cannot be deleted.
	if err := repo.Delete(ctx, "page", team.ID); !apperr.Is(err, apperr.CodeConflict) {
		t.Errorf("delete parent: err = %v", err)
	}
}

func TestRepositoryList(t *testing.T) {
	pool := testdb.New(t)
	repo := postgres.New(pool)
	ctx := context.Background()
	now := time.Now().UTC()

	mk := func(slug, status string, published *time.Time, category string) {
		e := &content.Entry{Type: "post", Title: "Post " + slug, Slug: slug, Status: content.Status(status),
			PublishedAt: published, Fields: map[string]any{"category": category}}
		must(t, repo.Create(ctx, e))
	}
	old, recent, future := now.Add(-48*time.Hour), now.Add(-time.Hour), now.Add(48*time.Hour)
	mk("old-news", "published", &old, "news")
	mk("recent-offer", "published", &recent, "offer")
	mk("scheduled-offer", "published", &future, "offer")
	mk("draft_100%", "draft", nil, "offer")

	list := func(f content.ListFilter) []string {
		f.Type, f.Limit = "post", 10
		if f.Order == "" {
			f.Order = content.OrderNewest
		}
		entries, total, err := repo.List(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		if total != len(entries) {
			t.Errorf("total = %d, entries = %d", total, len(entries))
		}
		var slugs []string
		for _, e := range entries {
			slugs = append(slugs, e.Slug)
		}
		return slugs
	}

	live := list(content.ListFilter{Statuses: []content.Status{content.StatusPublished}, LiveAt: &now})
	if len(live) != 2 || live[0] != "recent-offer" || live[1] != "old-news" {
		t.Errorf("live = %v", live)
	}
	offers := list(content.ListFilter{LiveAt: &now, Statuses: []content.Status{"published"}, Fields: map[string]string{"category": "offer"}})
	if len(offers) != 1 || offers[0] != "recent-offer" {
		t.Errorf("live offers = %v", offers)
	}
	// LIKE wildcards in the search term are matched literally.
	if got := list(content.ListFilter{Search: "100%"}); len(got) != 1 || got[0] != "draft_100%" {
		t.Errorf("search 100%% = %v", got)
	}
	if got := list(content.ListFilter{Search: "_"}); len(got) != 1 {
		t.Errorf("search _ = %v", got)
	}

	entries, total, err := repo.List(ctx, content.ListFilter{Type: "post", Limit: 1, Offset: 1, Order: content.OrderNewest})
	if err != nil || total != 4 || len(entries) != 1 {
		t.Errorf("paging: total %d, %d entries, %v", total, len(entries), err)
	}
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func ptr[T any](v T) *T { return &v }
