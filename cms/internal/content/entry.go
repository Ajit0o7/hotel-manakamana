// Package content implements WordPress-style content: every page, post or
// custom content type is an Entry, distinguished by its Type and described by
// a ContentType registered in a Registry.
package content

import (
	"time"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

// Status is the publishing state of an entry.
type Status string

const (
	StatusDraft     Status = "draft"
	StatusPublished Status = "published"
	StatusArchived  Status = "archived"
)

// Valid reports whether s is a known status.
func (s Status) Valid() bool {
	return s == StatusDraft || s == StatusPublished || s == StatusArchived
}

// Entry is one piece of content: a page, a post, or any registered type.
type Entry struct {
	ID    uuid.UUID `json:"id"`
	Type  string    `json:"type"`
	Title string    `json:"title"`
	Slug  string    `json:"slug"`
	// Path is the slash-joined slugs from the root ancestor down to this
	// entry ("about/team"). It is maintained by the database.
	Path    string `json:"path"`
	Content string `json:"content"` // sanitized HTML
	Excerpt string `json:"excerpt"`
	Status  Status `json:"status"`

	ParentID  *uuid.UUID `json:"parent_id"`
	MenuOrder int        `json:"menu_order"`
	Template  string     `json:"template"`

	FeaturedMediaID *uuid.UUID `json:"featured_media_id"`
	// Fields holds the type-specific custom fields declared by the
	// ContentType (e.g. a post's category).
	Fields map[string]any `json:"fields"`

	AuthorID *uuid.UUID `json:"author_id"`
	// PublishedAt is when the entry goes live. A published entry with a
	// future PublishedAt is scheduled and stays hidden until then.
	PublishedAt *time.Time `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// SEO is the Yoast-style metadata every entry carries.
	SEO seo.Meta `json:"seo"`
}

// IsLive reports whether the public site should show the entry at time now.
func (e *Entry) IsLive(now time.Time) bool {
	return e.Status == StatusPublished && e.PublishedAt != nil && !e.PublishedAt.After(now)
}
