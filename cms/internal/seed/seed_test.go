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
	if rows, _ := gallery.Fields["photos"].([]any); len(rows) != 26 {
		t.Errorf("gallery rows = %d", len(rows))
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
