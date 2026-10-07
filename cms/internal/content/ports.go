package content

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository persists entries together with their SEO metadata.
// Implementations return *apperr.Error values for not-found and conflicts.
type Repository interface {
	// Create inserts e and fills in ID, Path, CreatedAt and UpdatedAt.
	Create(ctx context.Context, e *Entry) error
	// Update saves e and refreshes Path and UpdatedAt.
	Update(ctx context.Context, e *Entry) error
	Delete(ctx context.Context, typ string, id uuid.UUID) error
	Get(ctx context.Context, typ string, id uuid.UUID) (*Entry, error)
	GetByPath(ctx context.Context, typ, path string) (*Entry, error)
	// List returns one page of matching entries and the total match count.
	List(ctx context.Context, f ListFilter) ([]*Entry, int, error)
}

// Order selects the sort order of a listing.
type Order string

const (
	// OrderMenu sorts by menu_order then title (the default for hierarchical types).
	OrderMenu Order = "menu"
	// OrderNewest sorts by publish date, newest first (the default otherwise).
	OrderNewest Order = "newest"
	// OrderUpdated sorts by last modification, newest first.
	OrderUpdated Order = "updated"
)

// ListFilter selects entries for a listing.
type ListFilter struct {
	Type     string
	Statuses []Status // empty means any status
	// LiveAt, if set, keeps only entries published at or before this time.
	LiveAt *time.Time
	// ParentID keeps only children of this entry; RootOnly keeps top-level entries.
	ParentID *uuid.UUID
	RootOnly bool
	// Search matches title, slug and excerpt (case-insensitive substring).
	Search string
	// Fields keeps entries whose custom field equals the given value.
	Fields map[string]string
	Order  Order
	Limit  int
	Offset int
}

// MediaRef is the view of a media item embedded in content responses.
type MediaRef struct {
	ID       uuid.UUID            `json:"id"`
	URL      string               `json:"url"`
	MimeType string               `json:"mime_type"`
	AltText  string               `json:"alt_text"`
	Caption  string               `json:"caption,omitempty"`
	Width    *int                 `json:"width,omitempty"`
	Height   *int                 `json:"height,omitempty"`
	Sizes    map[string]MediaSize `json:"sizes,omitempty"`
}

// MediaSize is one generated rendition of an image.
type MediaSize struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// MediaResolver looks up media library items. The content package depends on
// this narrow interface rather than on the media package itself.
type MediaResolver interface {
	// ResolveMedia returns the items that exist; missing IDs are omitted.
	ResolveMedia(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]MediaRef, error)
}

// Sanitizer cleans untrusted HTML before it is stored.
type Sanitizer interface {
	HTML(s string) string
}
