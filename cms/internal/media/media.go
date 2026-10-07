// Package media implements the media library: uploads to object storage
// (Supabase Storage), generated image renditions, and editable metadata.
package media

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/imaging"
)

// Kind is the broad category of a media item.
type Kind string

const (
	KindImage    Kind = "image"
	KindVideo    Kind = "video"
	KindDocument Kind = "document"
)

// Variant is a generated rendition stored next to the original.
type Variant struct {
	Path string `json:"path"`
	// URL is filled in when the item is read; it is not stored.
	URL      string `json:"url,omitempty"`
	MimeType string `json:"mime_type"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Size     int64  `json:"size_bytes"`
}

// Media is one item of the media library.
type Media struct {
	ID       uuid.UUID `json:"id"`
	Bucket   string    `json:"bucket"`
	Path     string    `json:"path"`
	URL      string    `json:"url"`
	Filename string    `json:"filename"`
	MimeType string    `json:"mime_type"`
	Kind     Kind      `json:"kind"`
	Size     int64     `json:"size_bytes"`
	Width    *int      `json:"width"`
	Height   *int      `json:"height"`

	Title       string `json:"title"`
	AltText     string `json:"alt_text"`
	Caption     string `json:"caption"`
	Description string `json:"description"`

	// Variants are keyed by size name: thumbnail, medium, large, og.
	Variants map[string]Variant `json:"variants"`

	UploadedBy *uuid.UUID `json:"uploaded_by"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// ObjectPaths lists every stored object of the item (original and variants).
func (m *Media) ObjectPaths() []string {
	paths := []string{m.Path}
	for _, v := range m.Variants {
		paths = append(paths, v.Path)
	}
	return paths
}

// Metadata is the editable part of a media item.
type Metadata struct {
	Title       *string `json:"title"`
	AltText     *string `json:"alt_text"`
	Caption     *string `json:"caption"`
	Description *string `json:"description"`
}

// ListFilter selects media for a listing.
type ListFilter struct {
	Kind   Kind
	Search string // filename, title, alt text (case-insensitive substring)
	Limit  int
	Offset int
}

// Repository persists media metadata.
type Repository interface {
	Create(ctx context.Context, m *Media) error
	Get(ctx context.Context, id uuid.UUID) (*Media, error)
	GetMany(ctx context.Context, ids []uuid.UUID) ([]*Media, error)
	List(ctx context.Context, f ListFilter) ([]*Media, int, error)
	// Update saves the editable metadata and refreshes UpdatedAt.
	Update(ctx context.Context, m *Media) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ObjectStore stores files. The Supabase Storage client implements it.
type ObjectStore interface {
	Bucket() string
	Upload(ctx context.Context, path, contentType string, body io.Reader, size int64) error
	Delete(ctx context.Context, paths ...string) error
	PublicURL(path string) string
}

// ImageProcessor generates renditions. *imaging.Processor implements it.
type ImageProcessor interface {
	Supports(mimeType string) bool
	Process(ctx context.Context, data []byte) (*imaging.Result, error)
}
