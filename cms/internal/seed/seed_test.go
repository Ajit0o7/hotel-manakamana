package seed_test

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/app"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	contentpg "github.com/Ajit0o7/hotel-manakamana/cms/internal/content/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/imaging"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
	mediapg "github.com/Ajit0o7/hotel-manakamana/cms/internal/media/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/sanitize"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seed"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/testdb"
)

type memStore struct {
	mu      sync.Mutex
	objects map[string]int
}

func (s *memStore) Bucket() string { return "media" }
func (s *memStore) Upload(_ context.Context, path, _ string, body io.Reader, _ int64) error {
	n, _ := io.Copy(io.Discard, body)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.objects[path] = int(n)
	return nil
}
func (s *memStore) Delete(context.Context, ...string) error { return nil }
func (s *memStore) PublicURL(path string) string            { return "https://cdn.test/" + path }

func TestImportBundle(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	log := slog.New(slog.DiscardHandler)

	store := &memStore{objects: map[string]int{}}
	mediaSvc := media.NewService(media.Deps{Repo: mediapg.New(pool), Store: store, Images: imaging.NewProcessor(), MaxBytes: 20 << 20})
	types := content.NewRegistry()
	app.RegisterContentTypes(types)
	contentSvc := content.NewService(content.Deps{
		Repo: contentpg.New(pool), Types: types, Media: app.MediaResolver{Media: mediaSvc},
		Sanitizer: sanitize.New(), Analyzer: seo.NewAnalyzer("www.hotelmanthali.com"), SiteURL: "https://www.hotelmanthali.com",
	})
	bundle, images, err := seed.Load()
	if err != nil {
		t.Fatal(err)
	}
	im := &seed.Importer{Pool: pool, Media: mediaSvc, Content: contentSvc, Log: log}

	if err := im.Run(ctx, bundle, images); err != nil {
		t.Fatalf("import: %v", err)
	}

	count := func(sql string) int {
		var n int
		if err := pool.QueryRow(ctx, sql).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if n := count("select count(*) from cms.media where blur_data_url like 'data:image/jpeg;base64,%'"); n != len(bundle.Media) {
		t.Errorf("%d photos with blur previews, want %d", n, len(bundle.Media))
	}
	if n := count("select count(*) from cms.entries where status = 'published'"); n != len(bundle.Entries) {
		t.Errorf("%d published entries, want %d", n, len(bundle.Entries))
	}

	// Rooms come back with their photos resolved, guides with real image URLs.
	rooms, _, err := contentSvc.ListLive(ctx, content.ListFilter{Type: "room"})
	if err != nil {
		t.Fatal(err)
	}
	pub, err := contentSvc.Present(ctx, rooms...)
	if err != nil {
		t.Fatal(err)
	}
	if len(pub) != 2 || pub[0].Title != "Deluxe Double Room" || len(pub[0].Media) != 5 || pub[0].FeaturedMedia == nil {
		t.Errorf("rooms = %+v", pub)
	}
	guide, err := contentSvc.GetLiveByPath(ctx, "post", "manthali-to-lukla-flights")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(guide.Content, "media:") || !strings.Contains(guide.Content, `src="https://cdn.test/`) ||
		!strings.Contains(guide.Content, "[airlines]") || !strings.Contains(guide.Content, `width="`) {
		t.Errorf("guide content not resolved: %.400s", guide.Content)
	}
	gallery, err := contentSvc.GetLiveByPath(ctx, "page", "gallery")
	if err != nil {
		t.Fatal(err)
	}
	sections, _ := gallery.Fields["sections"].([]any)
	if len(sections) != 3 {
		t.Fatalf("gallery sections = %v", sections)
	}
	if rows, _ := sections[1].(map[string]any)["photos"].([]any); len(rows) != 26 {
		t.Errorf("gallery rows = %d", len(rows))
	}
	home, err := contentSvc.GetLiveByPath(ctx, "page", "home")
	if err != nil {
		t.Fatal(err)
	}
	if hp, err := contentSvc.Present(ctx, home); err != nil || len(hp[0].Media) < 10 {
		t.Errorf("home page photos = %d, %v", len(hp[0].Media), err)
	}
	settings, err := contentSvc.GetLiveByPath(ctx, "settings", "hotel")
	if err != nil || settings.Fields["phone"] != "+977 984-4228627" {
		t.Errorf("settings = %v, %v", settings, err)
	}

	// Running again changes nothing, and deleted items stay deleted.
	uploads := len(store.objects)
	if err := contentSvc.Delete(ctx, "post", guide.ID); err != nil {
		t.Fatal(err)
	}
	if err := im.Run(ctx, bundle, images); err != nil {
		t.Fatal(err)
	}
	if len(store.objects) != uploads {
		t.Errorf("second run uploaded again: %d → %d objects", uploads, len(store.objects))
	}
	if n := count("select count(*) from cms.entries"); n != len(bundle.Entries)-1 {
		t.Errorf("second run recreated entries: %d", n)
	}
}

func TestImportKeepsEditorEntries(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	store := &memStore{objects: map[string]int{}}
	mediaSvc := media.NewService(media.Deps{Repo: mediapg.New(pool), Store: store, Images: imaging.NewProcessor(), MaxBytes: 20 << 20})
	types := content.NewRegistry()
	app.RegisterContentTypes(types)
	contentSvc := content.NewService(content.Deps{
		Repo: contentpg.New(pool), Types: types, Media: app.MediaResolver{Media: mediaSvc},
		Sanitizer: sanitize.New(), Analyzer: seo.NewAnalyzer(""), SiteURL: "https://example.com",
	})
	// An editor already wrote their own Dining page.
	mine, err := contentSvc.Create(ctx, "page", content.Input{Title: "Our restaurant", Slug: "dining", Template: "dining"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	bundle, images, _ := seed.Load()
	im := &seed.Importer{Pool: pool, Media: mediaSvc, Content: contentSvc, Log: slog.New(slog.DiscardHandler)}
	if err := im.Run(ctx, bundle, images); err != nil {
		t.Fatal(err)
	}
	got, err := contentSvc.Get(ctx, "page", mine.ID)
	if err != nil || got.Title != "Our restaurant" {
		t.Errorf("editor's page changed: %+v, %v", got, err)
	}
}

// A CMS that imported the first bundle (pages without sections, the gallery
// photos in an old "photos" field) gets sections added, without touching
// pages an editor has already built.
func TestPatchesAddSectionsToOlderPages(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	store := &memStore{objects: map[string]int{}}
	mediaSvc := media.NewService(media.Deps{Repo: mediapg.New(pool), Store: store, Images: imaging.NewProcessor(), MaxBytes: 20 << 20})
	types := content.NewRegistry()
	app.RegisterContentTypes(types)
	contentSvc := content.NewService(content.Deps{
		Repo: contentpg.New(pool), Types: types, Media: app.MediaResolver{Media: mediaSvc},
		Sanitizer: sanitize.New(), Analyzer: seo.NewAnalyzer(""), SiteURL: "https://example.com",
	})
	bundle, images, _ := seed.Load()
	im := &seed.Importer{Pool: pool, Media: mediaSvc, Content: contentSvc, Log: slog.New(slog.DiscardHandler)}
	if err := im.Run(ctx, bundle, images); err != nil {
		t.Fatal(err)
	}

	// The gallery's photos, which an editor has cut down to the first two.
	gallery, _ := contentSvc.GetLiveByPath(ctx, "page", "gallery")
	first := gallery.Fields["sections"].([]any)[1].(map[string]any)["photos"].([]any)[:2]

	// Turn the pages back into what the first version imported, and forget the patches.
	exec := func(sql string, args ...any) {
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`update cms.entries set fields = '{}' where type = 'page'`)
	exec(`update cms.entries set fields = jsonb_build_object('photos', $1::jsonb) where id = $2`, first, gallery.ID)
	exec(`delete from cms.seed_items where key like 'page:%:sections'`)
	// An editor has rebuilt the Dining page meanwhile.
	dining, _ := contentSvc.GetLiveByPath(ctx, "page", "dining")
	mine := []any{map[string]any{"layout": "text", "heading": "Our *kitchen*"}}
	exec(`update cms.entries set fields = jsonb_build_object('sections', $1::jsonb) where id = $2`, mine, dining.ID)
	// And deleted the Location page.
	location, _ := contentSvc.GetLiveByPath(ctx, "page", "location")
	if err := contentSvc.Delete(ctx, "page", location.ID); err != nil {
		t.Fatal(err)
	}

	if err := im.Run(ctx, bundle, images); err != nil {
		t.Fatal(err)
	}
	sectionsOf := func(path string) []any {
		e, err := contentSvc.GetLiveByPath(ctx, "page", path)
		if err != nil {
			t.Fatal(err)
		}
		s, _ := e.Fields["sections"].([]any)
		return s
	}
	if n := len(sectionsOf("home")); n != 15 {
		t.Errorf("home has %d sections, want 15", n)
	}
	gallery, _ = contentSvc.GetLiveByPath(ctx, "page", "gallery")
	if _, old := gallery.Fields["photos"]; old || len(sectionsOf("gallery")) != 3 {
		t.Errorf("gallery fields = %v", gallery.Fields)
	}
	if rows := sectionsOf("gallery")[1].(map[string]any)["photos"].([]any); len(rows) != 2 {
		t.Errorf("the editor's %d gallery photos were not kept: %d", len(first), len(rows))
	}
	if s := sectionsOf("dining"); len(s) != 1 || s[0].(map[string]any)["heading"] != "Our *kitchen*" {
		t.Errorf("editor's dining page changed: %v", s)
	}
	if _, err := contentSvc.GetLiveByPath(ctx, "page", "location"); err == nil {
		t.Error("deleted page came back")
	}
}
