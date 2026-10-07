package media

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"io"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/imaging"
)

type fakeStore struct {
	objects map[string][]byte
	types   map[string]string
	failOn  string // upload paths containing this fail
}

func newFakeStore() *fakeStore {
	return &fakeStore{objects: map[string][]byte{}, types: map[string]string{}}
}

func (s *fakeStore) Bucket() string { return "media" }

func (s *fakeStore) Upload(_ context.Context, path, ct string, body io.Reader, size int64) error {
	if s.failOn != "" && strings.Contains(path, s.failOn) {
		return errors.New("storage down")
	}
	b, _ := io.ReadAll(body)
	if int64(len(b)) != size {
		return errors.New("size mismatch")
	}
	s.objects[path], s.types[path] = b, ct
	return nil
}

func (s *fakeStore) Delete(_ context.Context, paths ...string) error {
	for _, p := range paths {
		delete(s.objects, p)
	}
	return nil
}

func (s *fakeStore) PublicURL(path string) string { return "https://cdn.test/" + path }

type fakeRepo struct {
	items map[uuid.UUID]*Media
	fail  bool
}

func (r *fakeRepo) Create(_ context.Context, m *Media) error {
	if r.fail {
		return errors.New("db down")
	}
	m.CreatedAt, m.UpdatedAt = time.Now(), time.Now()
	cp := *m
	r.items[m.ID] = &cp
	return nil
}

func (r *fakeRepo) Get(_ context.Context, id uuid.UUID) (*Media, error) {
	if m, ok := r.items[id]; ok {
		cp := *m
		return &cp, nil
	}
	return nil, apperr.NotFound("media item not found")
}

func (r *fakeRepo) GetMany(context.Context, []uuid.UUID) ([]*Media, error)  { return nil, nil }
func (r *fakeRepo) List(context.Context, ListFilter) ([]*Media, int, error) { return nil, 0, nil }

func (r *fakeRepo) Update(_ context.Context, m *Media) error {
	cp := *m
	r.items[m.ID] = &cp
	return nil
}

func (r *fakeRepo) Delete(_ context.Context, id uuid.UUID) error {
	delete(r.items, id)
	return nil
}

func newTestService(store *fakeStore, repo *fakeRepo) *Service {
	return NewService(Deps{
		Repo: repo, Store: store, Images: imaging.NewProcessor(), MaxBytes: 5 << 20,
		Now: func() time.Time { return time.Date(2026, 10, 7, 0, 0, 0, 0, time.UTC) },
	})
}

func pngBytes(w, h int) []byte {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for i := range img.Pix {
		img.Pix[i] = 200
	}
	img.Set(0, 0, color.Black)
	var buf bytes.Buffer
	png.Encode(&buf, img)
	return buf.Bytes()
}

func upload(svc *Service, name string, data []byte, md Metadata) (*Media, error) {
	return svc.Upload(context.Background(), UploadInput{
		File: bytes.NewReader(data), Size: int64(len(data)), Filename: name, Metadata: md,
	})
}

func TestUploadImage(t *testing.T) {
	store, repo := newFakeStore(), &fakeRepo{items: map[uuid.UUID]*Media{}}
	svc := newTestService(store, repo)
	alt := "  Rooftop terrace at sunset "

	// The client calls it .gif; the content says PNG, and PNG wins.
	m, err := upload(svc, "C:\\Photos\\Rooftop Terrace (1).gif", pngBytes(1600, 900), Metadata{AltText: &alt})
	if err != nil {
		t.Fatal(err)
	}
	if m.Kind != KindImage || m.MimeType != "image/png" || *m.Width != 1600 || *m.Height != 900 {
		t.Errorf("media = %+v", m)
	}
	if m.Filename != "Rooftop Terrace (1).gif" || m.AltText != "Rooftop terrace at sunset" {
		t.Errorf("filename/alt = %q / %q", m.Filename, m.AltText)
	}
	wantPath := "2026/10/" + m.ID.String() + "/rooftop-terrace-1.png"
	if m.Path != wantPath || m.URL != "https://cdn.test/"+wantPath {
		t.Errorf("path = %q, url = %q", m.Path, m.URL)
	}
	if len(m.Variants) != 4 || len(store.objects) != 5 {
		t.Errorf("variants = %d, stored objects = %d", len(m.Variants), len(store.objects))
	}
	thumb := m.Variants["thumbnail"]
	if thumb.Width != 300 || thumb.MimeType != "image/webp" || !strings.HasSuffix(thumb.Path, "-thumbnail.webp") ||
		thumb.URL == "" || store.types[thumb.Path] != "image/webp" {
		t.Errorf("thumbnail = %+v", thumb)
	}
	if _, ok := repo.items[m.ID]; !ok {
		t.Error("not saved to repository")
	}

	// Delete removes the record and every stored object.
	if err := svc.Delete(context.Background(), m.ID); err != nil {
		t.Fatal(err)
	}
	if len(store.objects) != 0 || len(repo.items) != 0 {
		t.Errorf("left behind: %d objects, %d records", len(store.objects), len(repo.items))
	}
}

func TestUploadDocument(t *testing.T) {
	svc := newTestService(newFakeStore(), &fakeRepo{items: map[uuid.UUID]*Media{}})
	m, err := upload(svc, "menu.pdf", []byte("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n"), Metadata{})
	if err != nil {
		t.Fatal(err)
	}
	if m.Kind != KindDocument || m.MimeType != "application/pdf" || m.Width != nil || len(m.Variants) != 0 {
		t.Errorf("media = %+v", m)
	}
	m, err = upload(svc, "rates.csv", []byte("room,price\ndeluxe,3500\ndouble,2500\n"), Metadata{})
	if err != nil || m.MimeType != "text/csv" {
		t.Errorf("csv: %+v, %v", m, err)
	}
}

func TestUploadRejects(t *testing.T) {
	svc := newTestService(newFakeStore(), &fakeRepo{items: map[uuid.UUID]*Media{}})
	cases := []struct {
		name string
		data []byte
		code apperr.Code
	}{
		{"x.html", []byte("<!doctype html><html><script>alert(1)</script></html>"), apperr.CodeUnsupported},
		{"logo.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`), apperr.CodeUnsupported},
		{"run.exe", append([]byte("MZ"), make([]byte, 200)...), apperr.CodeUnsupported},
		{"empty.jpg", nil, apperr.CodeInvalid},
		{"big.pdf", append([]byte("%PDF-1.7\n"), make([]byte, 6<<20)...), apperr.CodeTooLarge},
		{"broken.png", append(pngBytes(4, 4)[:40], 0, 0, 0), apperr.CodeInvalid},
	}
	for _, c := range cases {
		_, err := upload(svc, c.name, c.data, Metadata{})
		if !apperr.Is(err, c.code) {
			t.Errorf("%s: err = %v, want %s", c.name, err, c.code)
		}
	}
	long := strings.Repeat("a", 1001)
	if _, err := upload(svc, "a.png", pngBytes(4, 4), Metadata{AltText: &long}); !apperr.Is(err, apperr.CodeInvalid) {
		t.Errorf("over-long alt text: err = %v", err)
	}
}

func TestUploadRollsBackOnFailure(t *testing.T) {
	// A rendition upload fails: the original must be removed again.
	store := newFakeStore()
	store.failOn = "-large"
	svc := newTestService(store, &fakeRepo{items: map[uuid.UUID]*Media{}})
	if _, err := upload(svc, "a.png", pngBytes(400, 300), Metadata{}); err == nil {
		t.Fatal("expected an error")
	}
	if len(store.objects) != 0 {
		t.Errorf("objects left behind: %v", keys(store.objects))
	}

	// The database insert fails: every uploaded object must be removed.
	store = newFakeStore()
	svc = newTestService(store, &fakeRepo{items: map[uuid.UUID]*Media{}, fail: true})
	if _, err := upload(svc, "a.png", pngBytes(400, 300), Metadata{}); err == nil {
		t.Fatal("expected an error")
	}
	if len(store.objects) != 0 {
		t.Errorf("objects left behind: %v", keys(store.objects))
	}
}

func TestUpdateMetadata(t *testing.T) {
	repo := &fakeRepo{items: map[uuid.UUID]*Media{}}
	svc := newTestService(newFakeStore(), repo)
	title := "Old"
	m, _ := upload(svc, "a.png", pngBytes(10, 10), Metadata{Title: &title})

	caption := " Morning view "
	m, err := svc.UpdateMetadata(context.Background(), m.ID, Metadata{Caption: &caption})
	if err != nil {
		t.Fatal(err)
	}
	if m.Title != "Old" || m.Caption != "Morning view" {
		t.Errorf("title/caption = %q / %q", m.Title, m.Caption)
	}
	if _, err := svc.UpdateMetadata(context.Background(), uuid.New(), Metadata{}); !apperr.Is(err, apperr.CodeNotFound) {
		t.Errorf("missing item: err = %v", err)
	}
}

func TestStorageName(t *testing.T) {
	for in, want := range map[string]string{
		"Hotel Lobby.JPG":       "hotel-lobby",
		"../../etc/passwd":      "passwd",
		"मनकामना.png":           "file",
		"Room 101 – view.jpeg":  "room-101-view",
		strings.Repeat("a", 99): strings.Repeat("a", 80),
	} {
		if got := storageName(in); got != want {
			t.Errorf("storageName(%q) = %q, want %q", in, got, want)
		}
	}
}

func keys(m map[string][]byte) []string {
	var out []string
	for k := range m {
		out = append(out, k)
	}
	slices.Sort(out)
	return out
}
