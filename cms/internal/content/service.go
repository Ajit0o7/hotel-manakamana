package content

import (
	"context"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

const (
	maxTitleLen   = 300
	maxExcerptLen = 2000
	maxContentLen = 2 << 20 // 2 MiB of HTML
	MaxPageSize   = 100
)

// Input is the editable part of an entry, as sent by the admin UI.
type Input struct {
	Title           string         `json:"title"`
	Slug            string         `json:"slug"`
	Content         string         `json:"content"`
	Excerpt         string         `json:"excerpt"`
	Status          Status         `json:"status"`
	ParentID        *uuid.UUID     `json:"parent_id"`
	MenuOrder       int            `json:"menu_order"`
	Template        string         `json:"template"`
	FeaturedMediaID *uuid.UUID     `json:"featured_media_id"`
	Fields          map[string]any `json:"fields"`
	PublishedAt     *time.Time     `json:"published_at"`
	SEO             seo.Meta       `json:"seo"`
}

// Deps are the collaborators of a Service.
type Deps struct {
	Repo      Repository
	Types     *Registry
	Media     MediaResolver
	Sanitizer Sanitizer
	Analyzer  *seo.Analyzer
	// SiteURL is the public site origin, e.g. https://www.hotelmanthali.com.
	SiteURL string
	// Now defaults to time.Now.
	Now func() time.Time
}

// Service implements the content use cases for every registered type.
type Service struct {
	Deps
}

// NewService wires a Service.
func NewService(d Deps) *Service {
	if d.Now == nil {
		d.Now = time.Now
	}
	d.SiteURL = strings.TrimRight(d.SiteURL, "/")
	return &Service{Deps: d}
}

// Type returns a registered content type or a not-found error.
func (s *Service) Type(name string) (ContentType, error) {
	ct, ok := s.Types.Get(name)
	if !ok {
		return ContentType{}, apperr.NotFound("unknown content type %q", name)
	}
	return ct, nil
}

// Create validates and stores a new entry.
func (s *Service) Create(ctx context.Context, typ string, in Input, author *uuid.UUID) (*Entry, error) {
	ct, err := s.Type(typ)
	if err != nil {
		return nil, err
	}
	e := &Entry{Type: ct.Name, AuthorID: author}
	if err := s.apply(ctx, ct, e, in); err != nil {
		return nil, err
	}
	if err := s.Repo.Create(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

// Update replaces the editable fields of an existing entry.
func (s *Service) Update(ctx context.Context, typ string, id uuid.UUID, in Input) (*Entry, error) {
	ct, err := s.Type(typ)
	if err != nil {
		return nil, err
	}
	e, err := s.Repo.Get(ctx, ct.Name, id)
	if err != nil {
		return nil, err
	}
	if err := s.apply(ctx, ct, e, in); err != nil {
		return nil, err
	}
	if err := s.Repo.Update(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

// Publish makes an entry public. With at in the future it is scheduled.
// Without at, an entry keeps its original publish date, or gets "now".
func (s *Service) Publish(ctx context.Context, typ string, id uuid.UUID, at *time.Time) (*Entry, error) {
	return s.setStatus(ctx, typ, id, func(e *Entry) {
		e.Status = StatusPublished
		switch {
		case at != nil:
			t := at.UTC()
			e.PublishedAt = &t
		case e.PublishedAt == nil:
			t := s.Now().UTC()
			e.PublishedAt = &t
		}
	})
}

// Unpublish turns an entry back into a draft.
func (s *Service) Unpublish(ctx context.Context, typ string, id uuid.UUID) (*Entry, error) {
	return s.setStatus(ctx, typ, id, func(e *Entry) { e.Status = StatusDraft })
}

func (s *Service) setStatus(ctx context.Context, typ string, id uuid.UUID, change func(*Entry)) (*Entry, error) {
	ct, err := s.Type(typ)
	if err != nil {
		return nil, err
	}
	e, err := s.Repo.Get(ctx, ct.Name, id)
	if err != nil {
		return nil, err
	}
	change(e)
	if err := s.Repo.Update(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

// Delete removes an entry. Entries that still have children cannot be deleted.
func (s *Service) Delete(ctx context.Context, typ string, id uuid.UUID) error {
	ct, err := s.Type(typ)
	if err != nil {
		return err
	}
	return s.Repo.Delete(ctx, ct.Name, id)
}

// Get returns any entry (draft or not), for the admin API.
func (s *Service) Get(ctx context.Context, typ string, id uuid.UUID) (*Entry, error) {
	ct, err := s.Type(typ)
	if err != nil {
		return nil, err
	}
	return s.Repo.Get(ctx, ct.Name, id)
}

// List returns entries in any status, for the admin API.
func (s *Service) List(ctx context.Context, f ListFilter) ([]*Entry, int, error) {
	ct, err := s.Type(f.Type)
	if err != nil {
		return nil, 0, err
	}
	if err := s.normalizeFilter(ct, &f); err != nil {
		return nil, 0, err
	}
	return s.Repo.List(ctx, f)
}

// ListLive returns entries the public site may show right now.
func (s *Service) ListLive(ctx context.Context, f ListFilter) ([]*Entry, int, error) {
	now := s.Now()
	f.Statuses = []Status{StatusPublished}
	f.LiveAt = &now
	return s.List(ctx, f)
}

// GetLiveByPath returns a live entry by its path ("about/team").
func (s *Service) GetLiveByPath(ctx context.Context, typ, path string) (*Entry, error) {
	ct, err := s.Type(typ)
	if err != nil {
		return nil, err
	}
	path = strings.Trim(path, "/")
	if path == "" {
		return nil, apperr.NotFound("no %s at this path", ct.Label)
	}
	e, err := s.Repo.GetByPath(ctx, ct.Name, path)
	if err != nil {
		return nil, err
	}
	if !e.IsLive(s.Now()) {
		return nil, apperr.NotFound("no %s at this path", ct.Label)
	}
	return e, nil
}

// Analyze runs the SEO analysis of a stored entry.
func (s *Service) Analyze(ctx context.Context, typ string, id uuid.UUID) (seo.Report, error) {
	e, err := s.Get(ctx, typ, id)
	if err != nil {
		return seo.Report{}, err
	}
	ct, err := s.Type(typ)
	if err != nil {
		return seo.Report{}, err
	}
	return s.Analyzer.Analyze(analysisInput(ct, e)), nil
}

func analysisInput(ct ContentType, e *Entry) seo.Input {
	return seo.Input{
		Title:            e.Title,
		Slug:             e.Slug,
		Content:          e.Content + ct.SectionsHTML(e.Template, e.Fields),
		Excerpt:          e.Excerpt,
		HasFeaturedImage: e.FeaturedMediaID != nil,
		Meta:             e.SEO,
	}
}

func (s *Service) normalizeFilter(ct ContentType, f *ListFilter) error {
	f.Type = ct.Name
	if f.Limit <= 0 || f.Limit > MaxPageSize {
		f.Limit = 20
	}
	f.Offset = max(f.Offset, 0)
	if f.Order == "" {
		f.Order = OrderNewest
		if ct.Hierarchical || ct.Sortable {
			f.Order = OrderMenu
		}
	}
	switch f.Order {
	case OrderMenu, OrderNewest, OrderUpdated:
	default:
		return apperr.Invalid("unknown order %q", f.Order)
	}
	for _, st := range f.Statuses {
		if !st.Valid() {
			return apperr.Invalid("unknown status %q", st)
		}
	}
	for name := range f.Fields {
		if _, ok := ct.Field(name); !ok {
			return apperr.Invalid("%s has no field %q", ct.LabelPlural, name)
		}
	}
	return nil
}

// apply validates in and copies it onto e. It runs the SEO analysis so the
// stored scores always match the stored content.
func (s *Service) apply(ctx context.Context, ct ContentType, e *Entry, in Input) error {
	errs := map[string]string{}

	title := strings.TrimSpace(in.Title)
	switch {
	case title == "":
		errs["title"] = "is required"
	case utf8.RuneCountInString(title) > maxTitleLen:
		errs["title"] = fmt.Sprintf("must be at most %d characters", maxTitleLen)
	}

	slug := strings.ToLower(strings.TrimSpace(in.Slug))
	if slug == "" {
		slug = Slugify(title)
		if slug == "" && title != "" {
			errs["slug"] = "could not be derived from the title; please set one"
		}
	} else if !ValidSlug(slug) {
		errs["slug"] = "use lower-case letters, numbers and single hyphens"
	}

	status := in.Status
	if status == "" {
		status = StatusDraft
	}
	if !status.Valid() {
		errs["status"] = "must be draft, published or archived"
	}

	publishedAt := in.PublishedAt
	if publishedAt == nil {
		publishedAt = e.PublishedAt
	}
	if publishedAt == nil && status == StatusPublished {
		now := s.Now()
		publishedAt = &now
	}
	if publishedAt != nil {
		t := publishedAt.UTC()
		publishedAt = &t
	}

	if in.ParentID != nil {
		s.checkParent(ctx, ct, e, *in.ParentID, errs)
	}
	if !ct.HasTemplate(in.Template) {
		errs["template"] = "must be one of " + strings.Join(ct.Templates, ", ")
	}

	excerpt := strings.TrimSpace(in.Excerpt)
	if utf8.RuneCountInString(excerpt) > maxExcerptLen {
		errs["excerpt"] = fmt.Sprintf("must be at most %d characters", maxExcerptLen)
	}
	if len(in.Content) > maxContentLen {
		errs["content"] = fmt.Sprintf("must be at most %d bytes", maxContentLen)
	}

	fields, fieldErrs := ct.ValidateFields(in.Fields, in.Template)
	for k, v := range fieldErrs {
		errs[k] = v
	}

	meta := in.SEO
	meta.Normalize()
	for k, v := range meta.Validate() {
		errs[k] = v
	}

	// Every referenced media item must exist.
	refs := map[string]uuid.UUID{}
	if in.FeaturedMediaID != nil {
		refs["featured_media_id"] = *in.FeaturedMediaID
	}
	if meta.OGImageID != nil {
		refs["seo.og_image_id"] = *meta.OGImageID
	}
	for _, f := range ct.FieldsFor(in.Template) {
		for i, id := range f.MediaIDs(fields[f.Name]) {
			refs[fmt.Sprintf("fields.%s#%d", f.Name, i)] = id
		}
	}
	if err := s.checkMedia(ctx, refs, errs); err != nil {
		return err
	}

	if len(errs) > 0 {
		return apperr.Validation(errs)
	}

	for _, f := range ct.FieldsFor(in.Template) {
		if v, ok := fields[f.Name].(string); ok && f.Type == FieldRichText {
			fields[f.Name] = s.Sanitizer.HTML(v)
		}
		f.SanitizeRichText(fields[f.Name], s.Sanitizer.HTML)
	}

	e.Title = title
	e.Slug = slug
	e.Content = s.Sanitizer.HTML(in.Content)
	e.Excerpt = excerpt
	e.Status = status
	e.ParentID = in.ParentID
	e.MenuOrder = in.MenuOrder
	e.Template = in.Template
	e.FeaturedMediaID = in.FeaturedMediaID
	e.Fields = fields
	e.PublishedAt = publishedAt
	e.SEO = meta

	rep := s.Analyzer.Analyze(analysisInput(ct, e))
	e.SEO.SEOScore, e.SEO.ReadabilityScore = &rep.SEOScore, &rep.ReadabilityScore
	if rep.ReadabilityRating == "na" {
		e.SEO.ReadabilityScore = nil
	}
	return nil
}

func (s *Service) checkParent(ctx context.Context, ct ContentType, e *Entry, parentID uuid.UUID, errs map[string]string) {
	if !ct.Hierarchical {
		errs["parent_id"] = ct.LabelPlural + " cannot have a parent"
		return
	}
	if e.ID != uuid.Nil && parentID == e.ID {
		errs["parent_id"] = "an entry cannot be its own parent"
		return
	}
	parent, err := s.Repo.Get(ctx, ct.Name, parentID)
	if err != nil {
		if apperr.Is(err, apperr.CodeNotFound) {
			errs["parent_id"] = "parent " + ct.Label + " not found"
		} else {
			errs["parent_id"] = "could not be checked"
		}
		return
	}
	if e.ID != uuid.Nil && strings.HasPrefix(parent.Path+"/", e.Path+"/") {
		errs["parent_id"] = "cannot move an entry below one of its own descendants"
	}
}

func (s *Service) checkMedia(ctx context.Context, refs map[string]uuid.UUID, errs map[string]string) error {
	if len(refs) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(refs))
	for _, id := range refs {
		ids = append(ids, id)
	}
	found, err := s.Media.ResolveMedia(ctx, ids)
	if err != nil {
		return fmt.Errorf("resolve media: %w", err)
	}
	for field, id := range refs {
		if _, ok := found[id]; !ok {
			name, _, _ := strings.Cut(field, "#")
			errs[name] = "media item not found"
		}
	}
	return nil
}
