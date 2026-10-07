// Package seed imports the website's original content (hotel settings,
// rooms, guides, page SEO settings and their photos) into the CMS, once.
//
// The bundle in data/ is generated from the Next.js site's built-in content
// by scripts/export-cms-seed.mjs. The import runs in the background when the
// server starts. Every item it creates is recorded in cms.seed_items, so a
// restart continues where it stopped, nothing is imported twice, and items an
// editor deletes later are not brought back.
package seed

import (
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

//go:embed data
var data embed.FS

// Bundle is the content to import.
type Bundle struct {
	Version int     `json:"version"`
	Media   []Media `json:"media"`
	Entries []Entry `json:"entries"`
}

// Media is one photo of the bundle, stored in data/images.
type Media struct {
	Key   string `json:"key"`
	File  string `json:"file"`
	Alt   string `json:"alt"`
	Title string `json:"title"`
}

// Entry is one content entry. In Fields, string values "media:<key>" refer
// to a bundle photo; in Content, img src="media:<key>" does.
type Entry struct {
	Key         string         `json:"key"`
	Type        string         `json:"type"`
	Template    string         `json:"template"`
	Title       string         `json:"title"`
	Slug        string         `json:"slug"`
	Status      content.Status `json:"status"`
	PublishedAt *time.Time     `json:"published_at"`
	MenuOrder   int            `json:"menu_order"`
	Excerpt     string         `json:"excerpt"`
	Content     string         `json:"content"`
	Featured    string         `json:"featured"`
	Fields      map[string]any `json:"fields"`
	SEO         seo.Meta       `json:"seo"`
}

// Load reads the embedded bundle.
func Load() (*Bundle, fs.FS, error) {
	raw, err := data.ReadFile("data/content.json")
	if err != nil {
		return nil, nil, err
	}
	var b Bundle
	if err := json.Unmarshal(raw, &b); err != nil {
		return nil, nil, fmt.Errorf("seed bundle: %w", err)
	}
	images, err := fs.Sub(data, "data/images")
	return &b, images, err
}

// Importer creates the bundle's media and entries through the normal services,
// so everything is validated, processed and scored like an editor's upload.
type Importer struct {
	Pool    *pgxpool.Pool
	Media   *media.Service
	Content *content.Service
	Log     *slog.Logger
}

// lockID keeps two server instances from importing at the same time.
const lockID = 727_420_116

// Run imports whatever has not been imported yet.
func (im *Importer) Run(ctx context.Context, b *Bundle, images fs.FS) error {
	// The lock is held by a transaction that stays open for the whole import: unlike a session lock, it
	// is released even behind Supabase's transaction pooler, and if the server dies mid-import.
	lock, err := im.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer lock.Rollback(context.WithoutCancel(ctx)) //nolint:errcheck
	var locked bool
	if err := lock.QueryRow(ctx, "select pg_try_advisory_xact_lock($1)", lockID).Scan(&locked); err != nil {
		return err
	}
	if !locked {
		im.Log.Info("seed: another instance is importing; skipping")
		return nil
	}

	done := map[string]uuid.UUID{}
	rows, err := im.Pool.Query(ctx, "select key, ref from cms.seed_items")
	if err != nil {
		return err
	}
	for rows.Next() {
		var k string
		var id uuid.UUID
		if err := rows.Scan(&k, &id); err != nil {
			return err
		}
		done[k] = id
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(done) == len(b.Media)+len(b.Entries) {
		return nil
	}
	im.Log.Info("seed: importing the website's content", "photos", len(b.Media), "entries", len(b.Entries), "already_done", len(done))

	record := func(key string, id uuid.UUID) error {
		_, err := im.Pool.Exec(ctx, "insert into cms.seed_items (key, ref) values ($1, $2) on conflict (key) do nothing", key, id)
		done[key] = id
		return err
	}

	// Photos first: entries refer to them.
	for _, m := range b.Media {
		key := "media:" + m.Key
		if _, ok := done[key]; ok {
			continue
		}
		raw, err := fs.ReadFile(images, m.File)
		if err != nil {
			return fmt.Errorf("seed: read %s: %w", m.File, err)
		}
		alt, title := m.Alt, m.Title
		item, err := im.Media.Upload(ctx, media.UploadInput{
			File: bytes.NewReader(raw), Size: int64(len(raw)), Filename: m.File,
			Metadata: media.Metadata{AltText: &alt, Title: &title},
		})
		if err != nil {
			return fmt.Errorf("seed: upload %s: %w", m.File, err)
		}
		if err := record(key, item.ID); err != nil {
			return err
		}
		im.Log.Info("seed: photo imported", "file", m.File)
	}

	mediaByKey := map[string]*media.Media{}
	var ids []uuid.UUID
	for k, id := range done {
		if strings.HasPrefix(k, "media:") {
			ids = append(ids, id)
		}
	}
	items, err := im.Media.GetMany(ctx, ids)
	if err != nil {
		return err
	}
	byID := map[uuid.UUID]*media.Media{}
	for _, it := range items {
		byID[it.ID] = it
	}
	for k, id := range done {
		if m, ok := byID[id]; ok && strings.HasPrefix(k, "media:") {
			mediaByKey[strings.TrimPrefix(k, "media:")] = m
		}
	}

	var failed []error
	for _, e := range b.Entries {
		if _, ok := done[e.Key]; ok {
			continue
		}
		in, err := e.input(mediaByKey)
		if err != nil {
			failed = append(failed, fmt.Errorf("%s: %w", e.Key, err))
			continue
		}
		created, err := im.Content.Create(ctx, e.Type, in, nil)
		if apperr.Is(err, apperr.CodeConflict) {
			// An editor already made an entry at this address: keep theirs.
			im.Log.Info("seed: entry already exists; keeping it", "key", e.Key)
			if existing, gerr := im.Content.Repo.GetByPath(ctx, e.Type, e.Slug); gerr == nil {
				err = record(e.Key, existing.ID)
			} else {
				err = nil
			}
			if err != nil {
				return err
			}
			continue
		}
		if err != nil {
			failed = append(failed, fmt.Errorf("%s: %w", e.Key, err))
			continue
		}
		if err := record(e.Key, created.ID); err != nil {
			return err
		}
		im.Log.Info("seed: entry imported", "key", e.Key)
	}
	if len(failed) > 0 {
		return errors.Join(failed...)
	}
	im.Log.Info("seed: import complete")
	return nil
}

var imgRef = regexp.MustCompile(`src="media:([a-z0-9-]+)"`)

func (e Entry) input(mediaByKey map[string]*media.Media) (content.Input, error) {
	var missing []string
	resolveID := func(key string) string {
		m, ok := mediaByKey[key]
		if !ok {
			missing = append(missing, key)
			return ""
		}
		return m.ID.String()
	}

	html := imgRef.ReplaceAllStringFunc(e.Content, func(s string) string {
		key := imgRef.FindStringSubmatch(s)[1]
		m, ok := mediaByKey[key]
		if !ok {
			missing = append(missing, key)
			return s
		}
		url, w, h := m.URL, 0, 0
		if v, ok := m.Variants["large"]; ok {
			url, w, h = v.URL, v.Width, v.Height
		} else if m.Width != nil && m.Height != nil {
			w, h = *m.Width, *m.Height
		}
		return `src="` + url + `" width="` + strconv.Itoa(w) + `" height="` + strconv.Itoa(h) + `"`
	})

	in := content.Input{
		Title: e.Title, Slug: e.Slug, Content: html, Excerpt: e.Excerpt, Status: e.Status,
		MenuOrder: e.MenuOrder, Template: e.Template, PublishedAt: e.PublishedAt, SEO: e.SEO,
		Fields: resolveFields(e.Fields, resolveID).(map[string]any),
	}
	if e.Featured != "" {
		if id := resolveID(e.Featured); id != "" {
			u := uuid.MustParse(id)
			in.FeaturedMediaID = &u
		}
	}
	if len(missing) > 0 {
		return in, fmt.Errorf("unknown photos %v", missing)
	}
	return in, nil
}

// resolveFields replaces "media:<key>" strings anywhere in v with media IDs.
func resolveFields(v any, resolve func(string) string) any {
	switch x := v.(type) {
	case nil:
		return map[string]any{}
	case string:
		if key, ok := strings.CutPrefix(x, "media:"); ok {
			return resolve(key)
		}
		return x
	case []any:
		out := make([]any, len(x))
		for i, it := range x {
			out[i] = resolveFields(it, resolve)
		}
		return out
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, it := range x {
			out[k] = resolveFields(it, resolve)
		}
		return out
	}
	return v
}
