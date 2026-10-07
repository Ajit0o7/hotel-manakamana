package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/jpeg"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/app"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/auth"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	contentpg "github.com/Ajit0o7/hotel-manakamana/cms/internal/content/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/httpapi"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/imaging"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
	mediapg "github.com/Ajit0o7/hotel-manakamana/cms/internal/media/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/supabase"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/sanitize"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/testdb"
)

const jwtSecret = "e2e-test-secret-e2e-test-secret-e2e"

func init() { gin.SetMode(gin.TestMode) }

// fakeSupabaseStorage mimics the Storage endpoints the CMS uses.
type fakeSupabaseStorage struct {
	mu      sync.Mutex
	objects map[string]string // path → content type
}

func (f *fakeSupabaseStorage) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if r.Header.Get("apikey") != "sb_secret_test" {
		http.Error(w, `{"error":"Unauthorized","message":"bad key"}`, http.StatusUnauthorized)
		return
	}
	switch r.Method {
	case http.MethodPost:
		path := strings.TrimPrefix(r.URL.Path, "/storage/v1/object/media/")
		io.Copy(io.Discard, r.Body)
		f.objects[path] = r.Header.Get("Content-Type")
		w.Write([]byte(`{}`))
	case http.MethodDelete:
		var body struct{ Prefixes []string }
		json.NewDecoder(r.Body).Decode(&body)
		for _, p := range body.Prefixes {
			delete(f.objects, p)
		}
		w.Write([]byte(`[]`))
	}
}

type env struct {
	t          *testing.T
	srv        *httptest.Server
	storage    *fakeSupabaseStorage
	storageURL string
	admin      string
}

func setup(t *testing.T) *env {
	pool := testdb.New(t)
	storage := &fakeSupabaseStorage{objects: map[string]string{}}
	storageSrv := httptest.NewServer(storage)
	t.Cleanup(storageSrv.Close)

	types := content.NewRegistry()
	app.RegisterContentTypes(types)
	// A custom type, registered the same way a real one would be.
	types.MustRegister(content.ContentType{
		Name: "activity", Label: "Activity", LabelPlural: "Activities", RoutePrefix: "/activities",
		Fields: []content.Field{{Name: "price_npr", Label: "Price (NPR)", Type: content.FieldNumber, Required: true}},
	})

	verifier, err := auth.NewVerifier(context.Background(), auth.Config{
		HMACSecret: []byte(jwtSecret), Issuer: "https://test.supabase.co/auth/v1",
		Audience: "authenticated", AllowedRoles: []string{"admin"},
	})
	if err != nil {
		t.Fatal(err)
	}
	mediaSvc := media.NewService(media.Deps{
		Repo:     mediapg.New(pool),
		Store:    supabase.NewStorage(storageSrv.URL, "sb_secret_test", "media"),
		Images:   imaging.NewProcessor(),
		MaxBytes: 10 << 20,
	})
	analyzer := seo.NewAnalyzer("www.hotelmanthali.com")
	contentSvc := content.NewService(content.Deps{
		Repo: contentpg.New(pool), Types: types, Media: app.MediaResolver{Media: mediaSvc},
		Sanitizer: sanitize.New(), Analyzer: analyzer, SiteURL: "https://www.hotelmanthali.com",
	})
	srv := httptest.NewServer(httpapi.NewRouter(httpapi.Deps{
		Content: contentSvc, Media: mediaSvc, Analyzer: analyzer, Auth: verifier,
		CORSOrigins: []string{"https://admin.hotelmanthali.com"}, MaxUploadBytes: 10 << 20,
		Ready: pool.Ping,
	}))
	t.Cleanup(srv.Close)
	return &env{t: t, srv: srv, storage: storage, storageURL: storageSrv.URL, admin: token(t, "admin")}
}

func token(t *testing.T, role string) string {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "https://test.supabase.co/auth/v1", "aud": "authenticated", "sub": uuid.NewString(),
		"role": "authenticated", "exp": time.Now().Add(time.Hour).Unix(),
		"app_metadata": map[string]any{"cms_role": role},
	})
	s, err := tok.SignedString([]byte(jwtSecret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

type response struct {
	Status int
	Header http.Header
	Body   map[string]any
}

func (r response) data() map[string]any { m, _ := r.Body["data"].(map[string]any); return m }
func (r response) list() []any          { l, _ := r.Body["data"].([]any); return l }
func (r response) errFields() map[string]any {
	e, _ := r.Body["error"].(map[string]any)
	f, _ := e["fields"].(map[string]any)
	return f
}

func (e *env) do(method, path, tok string, body any) response {
	e.t.Helper()
	var rd io.Reader
	ct := ""
	switch b := body.(type) {
	case nil:
	case string:
		rd, ct = strings.NewReader(b), "application/json"
	default:
		raw, _ := json.Marshal(b)
		rd, ct = bytes.NewReader(raw), "application/json"
	}
	req, _ := http.NewRequest(method, e.srv.URL+path, rd)
	if ct != "" {
		req.Header.Set("Content-Type", ct)
	}
	if tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}
	return e.send(req)
}

func (e *env) send(req *http.Request) response {
	e.t.Helper()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer resp.Body.Close()
	out := response{Status: resp.StatusCode, Header: resp.Header}
	raw, _ := io.ReadAll(resp.Body)
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &out.Body); err != nil {
			e.t.Fatalf("%s %s: non-JSON body %q", req.Method, req.URL.Path, raw)
		}
	}
	return out
}

func (e *env) upload(filename string, data []byte, fields map[string]string) response {
	e.t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		mw.WriteField(k, v)
	}
	fw, _ := mw.CreateFormFile("file", filename)
	fw.Write(data)
	mw.Close()
	req, _ := http.NewRequest(http.MethodPost, e.srv.URL+"/api/v1/admin/media", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+e.admin)
	return e.send(req)
}

func expect(t *testing.T, what string, got response, status int) {
	t.Helper()
	if got.Status != status {
		t.Fatalf("%s: status %d, want %d; body %v", what, got.Status, status, got.Body)
	}
}

func photo(t *testing.T) []byte {
	img := image.NewRGBA(image.Rect(0, 0, 1800, 1200))
	for i := range img.Pix {
		img.Pix[i] = byte(i % 251)
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestEndToEnd(t *testing.T) {
	e := setup(t)
	admin := e.admin

	// --- Auth -------------------------------------------------------------
	expect(t, "no token", e.do("GET", "/api/v1/admin/me", "", nil), 401)
	expect(t, "bad token", e.do("GET", "/api/v1/admin/me", "nope", nil), 401)
	expect(t, "non-admin", e.do("GET", "/api/v1/admin/me", token(t, "guest"), nil), 403)
	me := e.do("GET", "/api/v1/admin/me", admin, nil)
	expect(t, "me", me, 200)
	if me.data()["role"] != "admin" || me.Header.Get("Cache-Control") != "no-store" {
		t.Errorf("me = %v, headers %v", me.Body, me.Header)
	}
	expect(t, "readyz", e.do("GET", "/readyz", "", nil), 200)

	// --- Media library ------------------------------------------------------
	up := e.upload("Rooftop Terrace.jpg", photo(t), map[string]string{"alt_text": "Rooftop terrace", "title": "Terrace"})
	expect(t, "upload", up, 201)
	img := up.data()
	imgID := img["id"].(string)
	variants := img["variants"].(map[string]any)
	if img["kind"] != "image" || img["width"] != 1800.0 || len(variants) != 4 || len(e.storage.objects) != 5 {
		t.Fatalf("upload = %v; stored %v", img, e.storage.objects)
	}
	if !strings.HasPrefix(img["url"].(string), e.storageURL+"/storage/v1/object/public/media/") {
		t.Errorf("url = %v", img["url"])
	}
	expect(t, "upload html", e.upload("x.html", []byte("<html><script>1</script></html>"), nil), 415)
	tooBig := e.upload("big.pdf", append([]byte("%PDF-1.7\n"), make([]byte, 12<<20)...), nil)
	expect(t, "upload too large", tooBig, 413)

	patched := e.do("PATCH", "/api/v1/admin/media/"+imgID, admin, map[string]any{"caption": "Sunset"})
	expect(t, "patch media", patched, 200)
	if patched.data()["caption"] != "Sunset" || patched.data()["alt_text"] != "Rooftop terrace" {
		t.Errorf("patched = %v", patched.data())
	}
	list := e.do("GET", "/api/v1/admin/media?kind=image&search=terrace", admin, nil)
	expect(t, "list media", list, 200)
	if len(list.list()) != 1 || list.Body["meta"].(map[string]any)["total"] != 1.0 {
		t.Errorf("media list = %v", list.Body)
	}

	// --- Pages ------------------------------------------------------------------
	about := e.do("POST", "/api/v1/admin/content/page", admin, map[string]any{
		"title": "About Us", "template": "about", "featured_media_id": imgID,
		"content": `<p onclick="steal()">Family-run hotel by Ramechhap airport.</p><script>alert(1)</script>`,
		"seo":     map[string]any{"focus_keyword": "Ramechhap hotel", "meta_description": "A family-run hotel by the airport."},
	})
	expect(t, "create page", about, 201)
	aboutID := about.data()["id"].(string)
	if c := about.data()["content"].(string); strings.Contains(c, "script") || strings.Contains(c, "onclick") {
		t.Errorf("content not sanitized: %q", c)
	}
	if about.data()["slug"] != "about-us" || about.data()["seo"].(map[string]any)["seo_score"] == nil {
		t.Errorf("page = %v", about.data())
	}
	if !strings.HasSuffix(about.Header.Get("Location"), "/content/page/"+aboutID) {
		t.Errorf("Location = %q", about.Header.Get("Location"))
	}

	team := e.do("POST", "/api/v1/admin/content/page", admin, map[string]any{
		"title": "Our Team", "slug": "team", "parent_id": aboutID, "status": "published",
		"seo": map[string]any{"meta_title": "Meet the team"},
	})
	expect(t, "create child page", team, 201)
	if team.data()["path"] != "about-us/team" {
		t.Errorf("child path = %v", team.data()["path"])
	}

	// The parent is still a draft, but the child is public on its own path.
	expect(t, "draft parent hidden", e.do("GET", "/api/v1/content/page/by-path/about-us", "", nil), 404)
	pub := e.do("GET", "/api/v1/content/page/by-path/about-us/team", "", nil)
	expect(t, "public child", pub, 200)
	head := pub.data()["head"].(map[string]any)
	if pub.data()["url"] != "/about-us/team" || head["title"] != "Meet the team" ||
		head["canonical"] != "https://www.hotelmanthali.com/about-us/team" || pub.data()["seo"] != nil {
		t.Errorf("public page = %v", pub.data())
	}
	if !strings.Contains(pub.Header.Get("Cache-Control"), "max-age=60") {
		t.Errorf("public Cache-Control = %q", pub.Header.Get("Cache-Control"))
	}

	expect(t, "publish", e.do("POST", "/api/v1/admin/content/page/"+aboutID+"/publish", admin, nil), 200)
	pub = e.do("GET", "/api/v1/content/page/by-path/about-us", "", nil)
	expect(t, "public parent", pub, 200)
	featured := pub.data()["featured_media"].(map[string]any)
	head = pub.data()["head"].(map[string]any)
	if featured["id"] != imgID || featured["alt_text"] != "Rooftop terrace" ||
		!strings.HasSuffix(head["og_image"].(string), "-og.jpg") || head["og_image_width"] != 1200.0 {
		t.Errorf("featured = %v; head = %v", featured, head)
	}

	// --- Validation and errors -------------------------------------------------
	bad := e.do("POST", "/api/v1/admin/content/page", admin, map[string]any{
		"title": "", "slug": "Bad Slug!", "seo": map[string]any{"canonical_url": "nope"},
	})
	expect(t, "invalid page", bad, 422)
	for _, k := range []string{"title", "slug", "seo.canonical_url"} {
		if bad.errFields()[k] == nil {
			t.Errorf("missing field error %s: %v", k, bad.Body)
		}
	}
	dup := e.do("POST", "/api/v1/admin/content/page", admin, map[string]any{"title": "Team", "parent_id": aboutID})
	expect(t, "duplicate slug", dup, 409)
	expect(t, "unknown JSON field", e.do("POST", "/api/v1/admin/content/page", admin, `{"title":"x","colour":"red"}`), 400)
	expect(t, "broken JSON", e.do("POST", "/api/v1/admin/content/page", admin, `{"title":`), 400)
	expect(t, "unknown type", e.do("GET", "/api/v1/admin/content/hotel", admin, nil), 404)
	expect(t, "bad id", e.do("GET", "/api/v1/admin/content/page/123", admin, nil), 404)
	expect(t, "cycle", e.do("PUT", "/api/v1/admin/content/page/"+aboutID, admin, map[string]any{
		"title": "About Us", "parent_id": team.data()["id"],
	}), 422)
	expect(t, "delete parent", e.do("DELETE", "/api/v1/admin/content/page/"+aboutID, admin, nil), 409)

	// --- Posts, custom fields, filtering ----------------------------------------
	for _, p := range []map[string]any{
		{"title": "Dashain Offer", "status": "published", "template": "offer", "fields": map[string]any{"eyebrow": "offer", "offer_price_npr": 3500}},
		{"title": "Airport News", "status": "published", "template": "news", "fields": map[string]any{"eyebrow": "news"}},
		{"title": "Draft Offer", "template": "offer", "fields": map[string]any{"eyebrow": "offer"}},
	} {
		expect(t, "create post", e.do("POST", "/api/v1/admin/content/post", admin, p), 201)
	}
	offers := e.do("GET", "/api/v1/content/post?field.eyebrow=offer", "", nil)
	expect(t, "public offers", offers, 200)
	if len(offers.list()) != 1 || offers.list()[0].(map[string]any)["url"] != "/guides/dashain-offer" {
		t.Errorf("offers = %v", offers.Body)
	}
	all := e.do("GET", "/api/v1/admin/content/post?status=draft&per_page=5", admin, nil)
	if len(all.list()) != 1 || all.Body["meta"].(map[string]any)["per_page"] != 5.0 {
		t.Errorf("admin drafts = %v", all.Body)
	}
	expect(t, "bad field filter", e.do("GET", "/api/v1/content/post?field.colour=red", "", nil), 422)

	// The custom "activity" type works with no extra code or migration.
	act := e.do("POST", "/api/v1/admin/content/activity", admin, map[string]any{"title": "Valley Walk", "status": "published"})
	expect(t, "activity missing required field", act, 422)
	act = e.do("POST", "/api/v1/admin/content/activity", admin, map[string]any{
		"title": "Valley Walk", "status": "published", "fields": map[string]any{"price_npr": 4500},
	})
	expect(t, "create activity", act, 201)
	pubAct := e.do("GET", "/api/v1/content/activity/by-path/valley-walk", "", nil)
	expect(t, "public activity", pubAct, 200)
	if pubAct.data()["url"] != "/activities/valley-walk" {
		t.Errorf("activity url = %v", pubAct.data()["url"])
	}

	// Built-in rooms: a gallery field's photos come back resolved in "media".
	room := e.do("POST", "/api/v1/admin/content/room", admin, map[string]any{
		"title": "Deluxe Double", "status": "published",
		"fields": map[string]any{"price_npr": 2500, "max_guests": 2, "photos": []any{imgID}},
	})
	expect(t, "create room", room, 201)
	pubRoom := e.do("GET", "/api/v1/content/room?order=menu", "", nil)
	expect(t, "public rooms", pubRoom, 200)
	rm := pubRoom.list()[0].(map[string]any)
	if photo, ok := rm["media"].(map[string]any)[imgID].(map[string]any); !ok || photo["blur_data_url"] == "" || photo["sizes"] == nil {
		t.Errorf("room media = %v", rm["media"])
	}
	types := e.do("GET", "/api/v1/content-types", "", nil)
	if len(types.list()) != 5 {
		t.Errorf("content types = %d, want 5", len(types.list()))
	}

	// --- SEO analysis ---------------------------------------------------------------
	rep := e.do("GET", "/api/v1/admin/content/page/"+aboutID+"/seo-analysis", admin, nil)
	expect(t, "entry analysis", rep, 200)
	if rep.data()["focus_keyword"] != "Ramechhap hotel" || len(rep.data()["results"].([]any)) == 0 {
		t.Errorf("analysis = %v", rep.data())
	}
	draft := e.do("POST", "/api/v1/admin/seo/analyze", admin, map[string]any{
		"title": "Lukla flights", "content": "<p>Lukla flights leave early.</p>",
		"seo": map[string]any{"focus_keyword": "lukla flights"},
	})
	expect(t, "draft analysis", draft, 200)
	if draft.data()["seo_score"] == nil {
		t.Errorf("draft analysis = %v", draft.data())
	}

	// --- Deleting media clears references and stored files -------------------------
	expect(t, "delete media", e.do("DELETE", "/api/v1/admin/media/"+imgID, admin, nil), 204)
	if len(e.storage.objects) != 0 {
		t.Errorf("objects left in storage: %v", e.storage.objects)
	}
	after := e.do("GET", "/api/v1/admin/content/page/"+aboutID, admin, nil)
	if after.data()["featured_media_id"] != nil {
		t.Errorf("featured_media_id = %v after media delete", after.data()["featured_media_id"])
	}

	// --- Unpublish, delete --------------------------------------------------------
	teamID := team.data()["id"].(string)
	expect(t, "unpublish", e.do("POST", "/api/v1/admin/content/page/"+teamID+"/unpublish", admin, nil), 200)
	expect(t, "unpublished hidden", e.do("GET", "/api/v1/content/page/by-path/about-us/team", "", nil), 404)
	expect(t, "delete child", e.do("DELETE", "/api/v1/admin/content/page/"+teamID, admin, nil), 204)
	expect(t, "delete parent", e.do("DELETE", "/api/v1/admin/content/page/"+aboutID, admin, nil), 204)
}

func TestCORS(t *testing.T) {
	e := setup(t)
	req, _ := http.NewRequest(http.MethodOptions, e.srv.URL+"/api/v1/admin/media", nil)
	req.Header.Set("Origin", "https://admin.hotelmanthali.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 204 || resp.Header.Get("Access-Control-Allow-Origin") != "https://admin.hotelmanthali.com" ||
		!strings.Contains(resp.Header.Get("Access-Control-Allow-Headers"), "Authorization") {
		t.Errorf("preflight: %d %v", resp.StatusCode, resp.Header)
	}

	req.Header.Set("Origin", "https://evil.example")
	resp, _ = http.DefaultClient.Do(req)
	resp.Body.Close()
	if resp.StatusCode != 403 || resp.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Errorf("foreign preflight: %d %v", resp.StatusCode, resp.Header)
	}
}
