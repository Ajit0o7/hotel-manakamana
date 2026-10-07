// Package supabase contains thin clients for Supabase platform services.
package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Storage is a minimal Supabase Storage client for one bucket. It uses a
// server-side secret key, which bypasses Storage RLS, so it must never be
// exposed to browsers.
type Storage struct {
	projectURL string
	key        string
	bucket     string
	http       *http.Client
	// CacheControl is sent with uploads. Object paths contain a UUID and are
	// never overwritten, so they can be cached for a long time.
	CacheControl string
}

// NewStorage returns a client for bucket in the project at projectURL
// (https://<ref>.supabase.co). secretKey is the service_role key or a new
// sb_secret_... key.
func NewStorage(projectURL, secretKey, bucket string) *Storage {
	return &Storage{
		projectURL:   strings.TrimRight(projectURL, "/"),
		key:          secretKey,
		bucket:       bucket,
		http:         &http.Client{Timeout: 5 * time.Minute},
		CacheControl: "31536000",
	}
}

// Bucket returns the bucket name.
func (s *Storage) Bucket() string { return s.bucket }

// Upload stores body at path. It fails if the object already exists.
func (s *Storage) Upload(ctx context.Context, path, contentType string, body io.Reader, size int64) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.objectURL("object", path), body)
	if err != nil {
		return err
	}
	req.ContentLength = size
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Cache-Control", "max-age="+s.CacheControl)
	req.Header.Set("x-upsert", "false")
	return s.do(req)
}

// Delete removes objects. Missing objects are not an error.
func (s *Storage) Delete(ctx context.Context, paths ...string) error {
	if len(paths) == 0 {
		return nil
	}
	body, _ := json.Marshal(map[string][]string{"prefixes": paths})
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete,
		s.projectURL+"/storage/v1/object/"+url.PathEscape(s.bucket), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	return s.do(req)
}

// PublicURL is the URL of an object in a public bucket.
func (s *Storage) PublicURL(path string) string {
	return s.objectURL("object/public", path)
}

func (s *Storage) objectURL(prefix, path string) string {
	segs := strings.Split(path, "/")
	for i, seg := range segs {
		segs[i] = url.PathEscape(seg)
	}
	return s.projectURL + "/storage/v1/" + prefix + "/" + url.PathEscape(s.bucket) + "/" + strings.Join(segs, "/")
}

// Error is a non-2xx response from Supabase Storage.
type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string {
	return fmt.Sprintf("supabase storage: HTTP %d: %s", e.Status, e.Message)
}

func (s *Storage) do(req *http.Request) error {
	req.Header.Set("apikey", s.key)
	// Legacy service_role keys are JWTs and go in Authorization too. New
	// sb_secret_ keys are not JWTs and must only be sent as apikey.
	if strings.HasPrefix(s.key, "eyJ") {
		req.Header.Set("Authorization", "Bearer "+s.key)
	}
	resp, err := s.http.Do(req)
	if err != nil {
		return fmt.Errorf("supabase storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		var body struct {
			Message string `json:"message"`
			Error   string `json:"error"`
		}
		msg := strings.TrimSpace(string(raw))
		if json.Unmarshal(raw, &body) == nil && (body.Message != "" || body.Error != "") {
			msg = strings.TrimSpace(body.Error + ": " + body.Message)
		}
		return &Error{Status: resp.StatusCode, Message: msg}
	}
	_, _ = io.Copy(io.Discard, resp.Body)
	return nil
}
