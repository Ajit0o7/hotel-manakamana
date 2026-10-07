package supabase

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStorageUploadAndDelete(t *testing.T) {
	var got []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		got = append(got, r.Method+" "+r.URL.EscapedPath())
		switch {
		case r.Method == http.MethodPost:
			if r.Header.Get("apikey") != "sb_secret_abc" || r.Header.Get("Authorization") != "" {
				t.Errorf("auth headers: apikey=%q authorization=%q", r.Header.Get("apikey"), r.Header.Get("Authorization"))
			}
			if r.Header.Get("Content-Type") != "image/webp" || r.Header.Get("x-upsert") != "false" ||
				r.Header.Get("Cache-Control") != "max-age=31536000" || string(body) != "data" {
				t.Errorf("upload request: headers %v, body %q", r.Header, body)
			}
			w.Write([]byte(`{"Key":"media/x"}`))
		case r.Method == http.MethodDelete:
			var req struct{ Prefixes []string }
			json.Unmarshal(body, &req)
			if strings.Join(req.Prefixes, ",") != "a/b.jpg,a/c.webp" {
				t.Errorf("delete body = %s", body)
			}
			w.Write([]byte(`[]`))
		}
	}))
	defer srv.Close()

	s := NewStorage(srv.URL+"/", "sb_secret_abc", "media")
	ctx := context.Background()
	if err := s.Upload(ctx, "2026/10/id/room one.webp", "image/webp", strings.NewReader("data"), 4); err != nil {
		t.Fatal(err)
	}
	if err := s.Delete(ctx, "a/b.jpg", "a/c.webp"); err != nil {
		t.Fatal(err)
	}
	want := []string{"POST /storage/v1/object/media/2026/10/id/room%20one.webp", "DELETE /storage/v1/object/media"}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Errorf("requests = %q, want %q", got, want)
	}
	if u := s.PublicURL("2026/10/id/a b.jpg"); u != srv.URL+"/storage/v1/object/public/media/2026/10/id/a%20b.jpg" {
		t.Errorf("PublicURL = %q", u)
	}
}

func TestStorageLegacyKeyAndErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer eyJlegacy" {
			t.Errorf("legacy JWT key not sent as bearer: %q", r.Header.Get("Authorization"))
		}
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}`))
	}))
	defer srv.Close()

	err := NewStorage(srv.URL, "eyJlegacy", "media").Upload(context.Background(), "a.jpg", "image/jpeg", strings.NewReader("x"), 1)
	var se *Error
	if !errors.As(err, &se) || se.Status != 400 || se.Message != "Duplicate: The resource already exists" {
		t.Errorf("err = %#v", err)
	}
}
