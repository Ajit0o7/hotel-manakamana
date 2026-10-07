package content

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Head is everything the frontend needs for the page's <head>, with Yoast-
// style fallbacks already applied (meta title → title, OG image → featured
// image, canonical → the entry's own URL, and so on).
type Head struct {
	Title         string `json:"title"`
	Description   string `json:"description"`
	Canonical     string `json:"canonical"`
	Robots        string `json:"robots"`
	OGType        string `json:"og_type"`
	OGTitle       string `json:"og_title"`
	OGDescription string `json:"og_description"`
	OGURL         string `json:"og_url"`
	OGImage       string `json:"og_image,omitempty"`
	OGImageAlt    string `json:"og_image_alt,omitempty"`
	OGImageWidth  int    `json:"og_image_width,omitempty"`
	OGImageHeight int    `json:"og_image_height,omitempty"`
	TwitterCard   string `json:"twitter_card"`
}

// PublicEntry is the shape the public website receives. It leaves out
// editorial details (author, focus keyword, scores) and adds the resolved
// URL, featured image and head metadata.
type PublicEntry struct {
	ID            uuid.UUID      `json:"id"`
	Type          string         `json:"type"`
	Title         string         `json:"title"`
	Slug          string         `json:"slug"`
	Path          string         `json:"path"`
	URL           string         `json:"url"`
	Content       string         `json:"content"`
	Excerpt       string         `json:"excerpt"`
	ParentID      *uuid.UUID     `json:"parent_id"`
	MenuOrder     int            `json:"menu_order"`
	Template      string         `json:"template"`
	FeaturedMedia *MediaRef      `json:"featured_media"`
	Fields        map[string]any `json:"fields"`
	// Media holds every media item the fields refer to (galleries, photo
	// tables...), keyed by ID, so one request has all the image details.
	Media       map[string]MediaRef `json:"media"`
	PublishedAt *time.Time          `json:"published_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	Head        Head                `json:"head"`
}

// Present converts entries to their public form, resolving media in one batch.
func (s *Service) Present(ctx context.Context, entries ...*Entry) ([]PublicEntry, error) {
	var ids []uuid.UUID
	fieldMedia := make([][]uuid.UUID, len(entries))
	for i, e := range entries {
		if e.FeaturedMediaID != nil {
			ids = append(ids, *e.FeaturedMediaID)
		}
		if e.SEO.OGImageID != nil {
			ids = append(ids, *e.SEO.OGImageID)
		}
		if ct, ok := s.Types.Get(e.Type); ok {
			for _, f := range ct.FieldsFor(e.Template) {
				fieldMedia[i] = append(fieldMedia[i], f.MediaIDs(e.Fields[f.Name])...)
			}
		}
		ids = append(ids, fieldMedia[i]...)
	}
	media := map[uuid.UUID]MediaRef{}
	if len(ids) > 0 {
		var err error
		if media, err = s.Media.ResolveMedia(ctx, ids); err != nil {
			return nil, err
		}
	}

	out := make([]PublicEntry, 0, len(entries))
	for i, e := range entries {
		ct, err := s.Type(e.Type)
		if err != nil {
			return nil, err
		}
		urlPath := ct.URLPath(e)
		p := PublicEntry{
			ID: e.ID, Type: e.Type, Title: e.Title, Slug: e.Slug, Path: e.Path, URL: urlPath,
			Content: e.Content, Excerpt: e.Excerpt, ParentID: e.ParentID, MenuOrder: e.MenuOrder,
			Template: e.Template, Fields: e.Fields, PublishedAt: e.PublishedAt, UpdatedAt: e.UpdatedAt,
		}
		if p.Fields == nil {
			p.Fields = map[string]any{}
		}
		p.Media = map[string]MediaRef{}
		for _, id := range fieldMedia[i] {
			if m, ok := media[id]; ok {
				p.Media[id.String()] = m
			}
		}
		if e.FeaturedMediaID != nil {
			if m, ok := media[*e.FeaturedMediaID]; ok {
				p.FeaturedMedia = &m
			}
		}
		p.Head = s.head(ct, e, urlPath, p.FeaturedMedia, media)
		out = append(out, p)
	}
	return out, nil
}

func (s *Service) head(ct ContentType, e *Entry, urlPath string, featured *MediaRef, media map[uuid.UUID]MediaRef) Head {
	m := e.SEO
	h := Head{
		Title:       first(m.MetaTitle, e.Title),
		Description: first(m.MetaDescription, e.Excerpt),
		Canonical:   first(m.CanonicalURL, s.SiteURL+urlPath),
		Robots:      m.Robots(),
		OGType:      "article",
		OGURL:       s.SiteURL + urlPath,
		TwitterCard: "summary",
	}
	if ct.Hierarchical {
		h.OGType = "website"
	}
	h.OGTitle = first(m.OGTitle, h.Title)
	h.OGDescription = first(m.OGDescription, h.Description)

	var img *MediaRef
	if m.OGImageID != nil {
		if ref, ok := media[*m.OGImageID]; ok {
			img = &ref
		}
	}
	switch {
	case img != nil:
	case m.OGImageURL != "":
		h.OGImage = m.OGImageURL
	case featured != nil:
		img = featured
	}
	if img != nil {
		h.OGImage, h.OGImageAlt = img.URL, img.AltText
		if img.Width != nil && img.Height != nil {
			h.OGImageWidth, h.OGImageHeight = *img.Width, *img.Height
		}
		// Prefer the 1200×630 JPEG rendition made for social cards: every
		// platform accepts JPEG, and it is far smaller than most originals.
		if og, ok := img.Sizes["og"]; ok {
			h.OGImage, h.OGImageWidth, h.OGImageHeight = og.URL, og.Width, og.Height
		}
	}
	if h.OGImage != "" {
		h.TwitterCard = "summary_large_image"
	}
	return h
}

func first(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
