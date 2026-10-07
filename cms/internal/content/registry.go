package content

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
)

// ContentType describes a kind of entry. Pages and posts are content types;
// so is anything you register yourself (rooms, offers, FAQs...). All types
// share the cms.entries table, so registering one needs no migration.
type ContentType struct {
	// Name is the identifier used in API URLs and stored in entries.type.
	// Lower-case letters, digits, "-" and "_"; must start with a letter.
	Name        string `json:"name"`
	Label       string `json:"label"`
	LabelPlural string `json:"label_plural"`
	Description string `json:"description,omitempty"`

	// Hierarchical types allow parent/child entries (like WordPress pages).
	Hierarchical bool `json:"hierarchical"`
	// Templates, if set, restricts entries to these template names.
	Templates []string `json:"templates,omitempty"`
	// Fields declares the type's custom fields, validated on save.
	Fields []Field `json:"fields,omitempty"`
	// TemplateFields declares extra fields for entries using a given
	// template (e.g. the photo list of the "gallery" page template).
	TemplateFields map[string][]Field `json:"template_fields,omitempty"`
	// Sortable types are ordered by menu_order (like hierarchical ones),
	// so editors can set the order, e.g. of rooms.
	Sortable bool `json:"sortable,omitempty"`

	// RoutePrefix is where the type lives on the public site ("/blog" for
	// posts, "" for pages). It is used to build default canonical URLs.
	RoutePrefix string `json:"route_prefix"`
	// Permalink overrides how an entry's public path is built. Optional;
	// the default is RoutePrefix + "/" + entry.Path.
	Permalink func(e *Entry) string `json:"-"`
}

// URLPath returns the entry's path on the public site, starting with "/".
func (ct ContentType) URLPath(e *Entry) string {
	if ct.Permalink != nil {
		return ct.Permalink(e)
	}
	return strings.TrimRight(ct.RoutePrefix, "/") + "/" + e.Path
}

// HasTemplate reports whether t is allowed for this type.
func (ct ContentType) HasTemplate(t string) bool {
	if t == "" || len(ct.Templates) == 0 {
		return true
	}
	for _, allowed := range ct.Templates {
		if allowed == t {
			return true
		}
	}
	return false
}

// FieldsFor returns the fields of an entry using template: the type's own
// fields followed by the template's extra fields.
func (ct ContentType) FieldsFor(template string) []Field {
	extra := ct.TemplateFields[template]
	if len(extra) == 0 {
		return ct.Fields
	}
	out := make([]Field, 0, len(ct.Fields)+len(extra))
	return append(append(out, ct.Fields...), extra...)
}

// Field returns the field definition named name, looking at the type's
// fields and every template's fields.
func (ct ContentType) Field(name string) (Field, bool) {
	for _, f := range ct.Fields {
		if f.Name == name {
			return f, true
		}
	}
	for _, fields := range ct.TemplateFields {
		for _, f := range fields {
			if f.Name == name {
				return f, true
			}
		}
	}
	return Field{}, false
}

var typeNameRe = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,63}$`)

func (ct ContentType) validate() error {
	if !typeNameRe.MatchString(ct.Name) {
		return fmt.Errorf("content type name %q must match %s", ct.Name, typeNameRe)
	}
	if ct.Label == "" {
		return fmt.Errorf("content type %q: label is required", ct.Name)
	}
	if ct.RoutePrefix != "" && !strings.HasPrefix(ct.RoutePrefix, "/") {
		return fmt.Errorf("content type %q: route_prefix must start with /", ct.Name)
	}
	check := func(fields []Field, seen map[string]bool) error {
		for _, f := range fields {
			if err := f.validate(); err != nil {
				return fmt.Errorf("content type %q: %w", ct.Name, err)
			}
			if seen[f.Name] {
				return fmt.Errorf("content type %q: duplicate field %q", ct.Name, f.Name)
			}
			seen[f.Name] = true
		}
		return nil
	}
	if err := check(ct.Fields, map[string]bool{}); err != nil {
		return err
	}
	for tpl, fields := range ct.TemplateFields {
		if !ct.HasTemplate(tpl) || tpl == "" {
			return fmt.Errorf("content type %q: template fields for unknown template %q", ct.Name, tpl)
		}
		seen := map[string]bool{}
		for _, f := range ct.Fields {
			seen[f.Name] = true
		}
		if err := check(fields, seen); err != nil {
			return err
		}
	}
	return nil
}

// Registry holds the known content types. It is safe for concurrent use.
type Registry struct {
	mu    sync.RWMutex
	types map[string]ContentType
	order []string
}

// NewRegistry returns an empty registry.
func NewRegistry() *Registry {
	return &Registry{types: map[string]ContentType{}}
}

// Register adds a content type. Names must be unique.
func (r *Registry) Register(ct ContentType) error {
	if ct.LabelPlural == "" {
		ct.LabelPlural = ct.Label + "s"
	}
	if err := ct.validate(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.types[ct.Name]; exists {
		return fmt.Errorf("content type %q is already registered", ct.Name)
	}
	r.types[ct.Name] = ct
	r.order = append(r.order, ct.Name)
	return nil
}

// MustRegister is Register that panics, for use at startup.
func (r *Registry) MustRegister(ct ContentType) {
	if err := r.Register(ct); err != nil {
		panic(err)
	}
}

// Get looks up a content type by name.
func (r *Registry) Get(name string) (ContentType, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ct, ok := r.types[name]
	return ct, ok
}

// All returns the registered types in registration order.
func (r *Registry) All() []ContentType {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]ContentType, 0, len(r.order))
	for _, n := range r.order {
		out = append(out, r.types[n])
	}
	return out
}

// LoadFile registers every content type defined in a JSON file holding an
// array of ContentType objects. This lets you add types without recompiling.
func (r *Registry) LoadFile(path string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var types []ContentType
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&types); err != nil {
		return fmt.Errorf("%s: %w", path, err)
	}
	for _, ct := range types {
		if err := r.Register(ct); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
	}
	return nil
}
