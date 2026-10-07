package media

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"path"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/imaging"
)

// MaxPageSize caps listing page sizes.
const MaxPageSize = 100

// Deps are the collaborators of a Service.
type Deps struct {
	Repo  Repository
	Store ObjectStore
	// Images generates renditions; nil disables image processing.
	Images ImageProcessor
	// MaxBytes is the largest accepted upload.
	MaxBytes int64
	Logger   *slog.Logger
	Now      func() time.Time
}

// Service implements the media library use cases.
type Service struct {
	Deps
}

// NewService wires a Service.
func NewService(d Deps) *Service {
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	if d.Now == nil {
		d.Now = time.Now
	}
	return &Service{Deps: d}
}

// UploadInput is one file to add to the library.
type UploadInput struct {
	File     io.ReadSeeker
	Size     int64
	Filename string
	Metadata
	UploadedBy *uuid.UUID
}

// Upload validates a file, generates image renditions, stores everything in
// the bucket and records it in the database. If any step fails, objects
// already uploaded are removed again.
func (s *Service) Upload(ctx context.Context, in UploadInput) (*Media, error) {
	if in.Size <= 0 {
		return nil, apperr.Invalid("the file is empty")
	}
	if in.Size > s.MaxBytes {
		return nil, apperr.TooLarge("the file is larger than the %d MB limit", s.MaxBytes>>20)
	}
	meta, err := cleanMetadata(in.Metadata)
	if err != nil {
		return nil, err
	}

	mime, ft, ok := detect(in.File, in.Filename)
	if !ok {
		return nil, apperr.Unsupported("files of type %s are not allowed", mime)
	}
	if _, err := in.File.Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("rewind upload: %w", err)
	}

	now := s.Now().UTC()
	id := uuid.New()
	dir := fmt.Sprintf("%04d/%02d/%s", now.Year(), now.Month(), id)
	base := storageName(in.Filename)
	m := &Media{
		ID:         id,
		Bucket:     s.Store.Bucket(),
		Path:       dir + "/" + base + ft.ext,
		Filename:   displayName(in.Filename, base+ft.ext),
		MimeType:   mime,
		Kind:       ft.kind,
		Size:       in.Size,
		Variants:   map[string]Variant{},
		UploadedBy: in.UploadedBy,
	}
	applyMetadata(m, meta)

	var body io.Reader = in.File
	var renditions []imaging.Rendition
	if ft.kind == KindImage && s.Images != nil && s.Images.Supports(mime) {
		data, err := io.ReadAll(io.LimitReader(in.File, s.MaxBytes+1))
		if err != nil {
			return nil, fmt.Errorf("read upload: %w", err)
		}
		res, err := s.Images.Process(ctx, data)
		switch {
		case errors.Is(err, imaging.ErrTooLarge):
			return nil, apperr.Invalid("the image's dimensions are too large to process")
		case ctx.Err() != nil:
			return nil, ctx.Err()
		case err != nil:
			return nil, &apperr.Error{Code: apperr.CodeInvalid, Message: "the image could not be read; it may be corrupt", Err: err}
		}
		m.Width, m.Height = &res.Width, &res.Height
		m.BlurDataURL = res.BlurDataURL
		renditions = res.Renditions
		body = bytes.NewReader(data)
	}

	var uploaded []string
	cleanup := func() {
		if len(uploaded) == 0 {
			return
		}
		ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
		defer cancel()
		if err := s.Store.Delete(ctx, uploaded...); err != nil {
			s.Logger.Error("media: could not remove objects after failed upload", "paths", uploaded, "err", err)
		}
	}

	if err := s.Store.Upload(ctx, m.Path, mime, body, in.Size); err != nil {
		return nil, fmt.Errorf("store original: %w", err)
	}
	uploaded = append(uploaded, m.Path)

	for _, r := range renditions {
		p := dir + "/" + base + "-" + r.Name + r.Ext
		if err := s.Store.Upload(ctx, p, r.MimeType, bytes.NewReader(r.Data), int64(len(r.Data))); err != nil {
			cleanup()
			return nil, fmt.Errorf("store %s rendition: %w", r.Name, err)
		}
		uploaded = append(uploaded, p)
		m.Variants[r.Name] = Variant{Path: p, MimeType: r.MimeType, Width: r.Width, Height: r.Height, Size: int64(len(r.Data))}
	}

	if err := s.Repo.Create(ctx, m); err != nil {
		cleanup()
		return nil, err
	}
	s.decorate(m)
	return m, nil
}

// Get returns one media item.
func (s *Service) Get(ctx context.Context, id uuid.UUID) (*Media, error) {
	m, err := s.Repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	s.decorate(m)
	return m, nil
}

// GetMany returns the items that exist among ids.
func (s *Service) GetMany(ctx context.Context, ids []uuid.UUID) ([]*Media, error) {
	items, err := s.Repo.GetMany(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, m := range items {
		s.decorate(m)
	}
	return items, nil
}

// List returns one page of the library, newest first.
func (s *Service) List(ctx context.Context, f ListFilter) ([]*Media, int, error) {
	if f.Kind != "" && f.Kind != KindImage && f.Kind != KindVideo && f.Kind != KindDocument {
		return nil, 0, apperr.Invalid("unknown kind %q", f.Kind)
	}
	if f.Limit <= 0 || f.Limit > MaxPageSize {
		f.Limit = 20
	}
	f.Offset = max(f.Offset, 0)
	items, total, err := s.Repo.List(ctx, f)
	if err != nil {
		return nil, 0, err
	}
	for _, m := range items {
		s.decorate(m)
	}
	return items, total, nil
}

// UpdateMetadata changes title, alt text, caption and description. Fields
// left nil are kept.
func (s *Service) UpdateMetadata(ctx context.Context, id uuid.UUID, md Metadata) (*Media, error) {
	md, err := cleanMetadata(md)
	if err != nil {
		return nil, err
	}
	m, err := s.Repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	applyMetadata(m, md)
	if err := s.Repo.Update(ctx, m); err != nil {
		return nil, err
	}
	s.decorate(m)
	return m, nil
}

// Delete removes the database record, then the stored objects. Content that
// referenced the item loses the reference (ON DELETE SET NULL).
func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	m, err := s.Repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := s.Repo.Delete(ctx, id); err != nil {
		return err
	}
	// The record is gone either way; a failure here only leaves orphaned
	// files in the bucket, so log it rather than fail the request.
	if err := s.Store.Delete(context.WithoutCancel(ctx), m.ObjectPaths()...); err != nil {
		s.Logger.Error("media: could not delete stored objects", "id", id, "paths", m.ObjectPaths(), "err", err)
	}
	return nil
}

func (s *Service) decorate(m *Media) {
	m.URL = s.Store.PublicURL(m.Path)
	for name, v := range m.Variants {
		v.URL = s.Store.PublicURL(v.Path)
		m.Variants[name] = v
	}
}

func cleanMetadata(md Metadata) (Metadata, error) {
	errs := map[string]string{}
	clean := func(name string, p **string, limit int) {
		if *p == nil {
			return
		}
		v := strings.TrimSpace(**p)
		if utf8.RuneCountInString(v) > limit {
			errs[name] = fmt.Sprintf("must be at most %d characters", limit)
		}
		*p = &v
	}
	clean("title", &md.Title, 300)
	clean("alt_text", &md.AltText, 1000)
	clean("caption", &md.Caption, 2000)
	clean("description", &md.Description, 5000)
	if len(errs) > 0 {
		return md, apperr.Validation(errs)
	}
	return md, nil
}

func applyMetadata(m *Media, md Metadata) {
	set := func(dst *string, v *string) {
		if v != nil {
			*dst = *v
		}
	}
	set(&m.Title, md.Title)
	set(&m.AltText, md.AltText)
	set(&m.Caption, md.Caption)
	set(&m.Description, md.Description)
}

// storageName turns a client file name into a safe ASCII object name
// (Supabase Storage keys only allow a limited character set).
func storageName(filename string) string {
	base := baseName(filename)
	name := strings.TrimSuffix(base, path.Ext(base))
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(name) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			if dash && b.Len() > 0 {
				b.WriteByte('-')
			}
			dash = false
			b.WriteRune(r)
			if b.Len() >= 80 {
				break
			}
		} else {
			dash = true
		}
	}
	if b.Len() == 0 {
		return "file"
	}
	return b.String()
}

// displayName keeps the client's file name for display, minus any directory.
func displayName(filename, fallback string) string {
	name := strings.TrimSpace(baseName(filename))
	if name == "" || name == "." || name == "/" || !utf8.ValidString(name) {
		return fallback
	}
	if utf8.RuneCountInString(name) > 255 {
		name = string([]rune(name)[:255])
	}
	return name
}

// baseName strips any directory, including Windows-style ones, that some
// browsers send as part of the file name.
func baseName(filename string) string {
	return path.Base(strings.ReplaceAll(filename, "\\", "/"))
}
