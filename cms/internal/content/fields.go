package content

import (
	"fmt"
	"math"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

// FieldType is the data type of a custom field.
type FieldType string

const (
	FieldText     FieldType = "text"     // single line, up to 500 characters
	FieldTextarea FieldType = "textarea" // plain multi-line text
	FieldRichText FieldType = "richtext" // HTML, sanitized like the body
	FieldNumber   FieldType = "number"
	FieldInteger  FieldType = "integer"
	FieldBoolean  FieldType = "boolean"
	FieldDate     FieldType = "date"     // YYYY-MM-DD
	FieldDateTime FieldType = "datetime" // RFC 3339
	FieldURL      FieldType = "url"
	FieldEmail    FieldType = "email"
	FieldMedia    FieldType = "media" // media library ID
	FieldSelect   FieldType = "select"
	FieldList     FieldType = "list" // array of short strings (tags, amenities)
	// FieldGallery is an ordered list of media library IDs (a photo gallery).
	FieldGallery FieldType = "gallery"
	// FieldTable is a list of rows; each row has the field's Columns (e.g. an
	// FAQ with question and answer, or policies with term and detail).
	FieldTable FieldType = "table"
	// FieldFlexible is a list of sections, ACF "flexible content" style: each
	// section uses one of the field's Layouts and holds that layout's fields.
	FieldFlexible FieldType = "flexible"
)

var knownFieldTypes = map[FieldType]bool{
	FieldText: true, FieldTextarea: true, FieldRichText: true, FieldNumber: true,
	FieldInteger: true, FieldBoolean: true, FieldDate: true, FieldDateTime: true,
	FieldURL: true, FieldEmail: true, FieldMedia: true, FieldSelect: true, FieldList: true,
	FieldGallery: true, FieldTable: true, FieldFlexible: true,
}

// columnTypes are the field types a table column may have.
var columnTypes = map[FieldType]bool{
	FieldText: true, FieldTextarea: true, FieldURL: true, FieldMedia: true, FieldSelect: true, FieldNumber: true,
	FieldBoolean: true,
}

// Field declares one custom field of a content type.
type Field struct {
	Name     string    `json:"name"`
	Label    string    `json:"label"`
	Type     FieldType `json:"type"`
	Required bool      `json:"required,omitempty"`
	Help     string    `json:"help,omitempty"`
	// Options are the allowed values of a select field (or column).
	Options []string `json:"options,omitempty"`
	// Columns are the cells of each row of a table field.
	Columns []Column `json:"columns,omitempty"`
	// Layouts are the kinds of section a flexible field can hold.
	Layouts []Layout `json:"layouts,omitempty"`
}

// Layout is one kind of section of a flexible field, e.g. "Photo and text".
// Its fields may be of any type except flexible.
type Layout struct {
	Name   string  `json:"name"`
	Label  string  `json:"label"`
	Help   string  `json:"help,omitempty"`
	Fields []Field `json:"fields"`
}

// LayoutKey is the key holding a section's layout name in a flexible value.
const LayoutKey = "layout"

func (f Field) layout(name string) (Layout, bool) {
	for _, l := range f.Layouts {
		if l.Name == name {
			return l, true
		}
	}
	return Layout{}, false
}

// Column is one cell of a table field's rows. Type is text, textarea, url,
// media, select or number; empty means text.
type Column struct {
	Name    string    `json:"name"`
	Label   string    `json:"label"`
	Type    FieldType `json:"type,omitempty"`
	Options []string  `json:"options,omitempty"`
}

func (c Column) field() Field {
	t := c.Type
	if t == "" {
		t = FieldText
	}
	return Field{Name: c.Name, Label: c.Label, Type: t, Options: c.Options}
}

var fieldNameRe = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

func (f Field) validate() error {
	if !fieldNameRe.MatchString(f.Name) {
		return fmt.Errorf("field name %q must match %s", f.Name, fieldNameRe)
	}
	if !knownFieldTypes[f.Type] {
		return fmt.Errorf("field %q: unknown type %q", f.Name, f.Type)
	}
	if f.Type == FieldSelect && len(f.Options) == 0 {
		return fmt.Errorf("field %q: select fields need options", f.Name)
	}
	if f.Type == FieldTable {
		if len(f.Columns) == 0 {
			return fmt.Errorf("field %q: table fields need columns", f.Name)
		}
		seen := map[string]bool{}
		for _, c := range f.Columns {
			cf := c.field()
			if !columnTypes[cf.Type] {
				return fmt.Errorf("field %q: column %q has unsupported type %q", f.Name, c.Name, c.Type)
			}
			if err := cf.validate(); err != nil {
				return fmt.Errorf("field %q: %w", f.Name, err)
			}
			if seen[c.Name] {
				return fmt.Errorf("field %q: duplicate column %q", f.Name, c.Name)
			}
			seen[c.Name] = true
		}
	}
	if f.Type == FieldFlexible {
		if len(f.Layouts) == 0 {
			return fmt.Errorf("field %q: flexible fields need layouts", f.Name)
		}
		layouts := map[string]bool{}
		for _, l := range f.Layouts {
			if !fieldNameRe.MatchString(l.Name) {
				return fmt.Errorf("field %q: layout name %q must match %s", f.Name, l.Name, fieldNameRe)
			}
			if layouts[l.Name] {
				return fmt.Errorf("field %q: duplicate layout %q", f.Name, l.Name)
			}
			layouts[l.Name] = true
			fields := map[string]bool{}
			for _, lf := range l.Fields {
				if lf.Type == FieldFlexible {
					return fmt.Errorf("field %q, layout %q: flexible fields cannot be nested", f.Name, l.Name)
				}
				if lf.Name == LayoutKey {
					return fmt.Errorf("field %q, layout %q: %q is reserved", f.Name, l.Name, LayoutKey)
				}
				if err := lf.validate(); err != nil {
					return fmt.Errorf("field %q, layout %q: %w", f.Name, l.Name, err)
				}
				if fields[lf.Name] {
					return fmt.Errorf("field %q, layout %q: duplicate field %q", f.Name, l.Name, lf.Name)
				}
				fields[lf.Name] = true
			}
		}
	}
	return nil
}

const (
	maxTextLen     = 500
	maxLongTextLen = 100_000
	maxListItems   = 100
	maxTableRows   = 200
	maxSections    = 60
)

// ValidateFields checks values against the fields of the type plus those of
// the given template, and returns the normalized values plus per-field errors
// keyed "fields.<name>". Unknown fields are rejected so typos do not silently
// disappear.
func (ct ContentType) ValidateFields(values map[string]any, template string) (map[string]any, map[string]string) {
	fields := ct.FieldsFor(template)
	out := map[string]any{}
	errs := map[string]string{}
	known := make(map[string]bool, len(fields))
	for _, f := range fields {
		known[f.Name] = true
	}
	for name := range values {
		if !known[name] {
			errs["fields."+name] = "unknown field"
		}
	}
	for _, f := range fields {
		raw, present := values[f.Name]
		if !present || raw == nil || raw == "" {
			if f.Required {
				errs["fields."+f.Name] = "is required"
			}
			continue
		}
		v, err := f.coerce(raw)
		if err != nil {
			errs["fields."+f.Name] = err.Error()
			continue
		}
		if f.Required && isEmptyCollection(v) {
			errs["fields."+f.Name] = "is required"
			continue
		}
		out[f.Name] = v
	}
	return out, errs
}

func isEmptyCollection(v any) bool {
	switch x := v.(type) {
	case []string:
		return len(x) == 0
	case []map[string]any:
		return len(x) == 0
	}
	return false
}

// MediaIDs returns the media library IDs referenced by a validated field value.
func (f Field) MediaIDs(v any) []uuid.UUID {
	var ids []uuid.UUID
	add := func(s any) {
		if str, ok := s.(string); ok {
			if id, err := uuid.Parse(str); err == nil {
				ids = append(ids, id)
			}
		}
	}
	switch f.Type {
	case FieldMedia:
		add(v)
	case FieldGallery:
		switch items := v.(type) {
		case []string:
			for _, it := range items {
				add(it)
			}
		case []any:
			for _, it := range items {
				add(it)
			}
		}
	case FieldTable:
		for _, c := range f.Columns {
			if c.Type != FieldMedia {
				continue
			}
			for _, r := range objects(v) {
				add(r[c.Name])
			}
		}
	case FieldFlexible:
		for _, section := range objects(v) {
			name, _ := section[LayoutKey].(string)
			l, ok := f.layout(name)
			if !ok {
				continue
			}
			for _, lf := range l.Fields {
				ids = append(ids, lf.MediaIDs(section[lf.Name])...)
			}
		}
	}
	return ids
}

// objects returns the objects of a table or flexible value, whether freshly
// validated ([]map[string]any) or read back from JSON ([]any).
func objects(v any) []map[string]any {
	switch rows := v.(type) {
	case []map[string]any:
		return rows
	case []any:
		out := make([]map[string]any, 0, len(rows))
		for _, r := range rows {
			if m, ok := r.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return out
	}
	return nil
}

func (f Field) coerce(raw any) (any, error) {
	switch f.Type {
	case FieldText, FieldTextarea, FieldRichText:
		s, ok := raw.(string)
		if !ok {
			return nil, fmt.Errorf("must be a string")
		}
		limit := maxLongTextLen
		if f.Type == FieldText {
			limit = maxTextLen
			s = strings.TrimSpace(s)
		}
		if utf8.RuneCountInString(s) > limit {
			return nil, fmt.Errorf("must be at most %d characters", limit)
		}
		return s, nil
	case FieldNumber:
		n, ok := raw.(float64)
		if !ok || math.IsNaN(n) || math.IsInf(n, 0) {
			return nil, fmt.Errorf("must be a number")
		}
		return n, nil
	case FieldInteger:
		n, ok := raw.(float64)
		if !ok || n != math.Trunc(n) || math.Abs(n) > 1<<53 {
			return nil, fmt.Errorf("must be an integer")
		}
		return int64(n), nil
	case FieldBoolean:
		b, ok := raw.(bool)
		if !ok {
			return nil, fmt.Errorf("must be true or false")
		}
		return b, nil
	case FieldDate:
		s, _ := raw.(string)
		if _, err := time.Parse(time.DateOnly, s); err != nil {
			return nil, fmt.Errorf("must be a date (YYYY-MM-DD)")
		}
		return s, nil
	case FieldDateTime:
		s, _ := raw.(string)
		t, err := time.Parse(time.RFC3339, s)
		if err != nil {
			return nil, fmt.Errorf("must be an RFC 3339 date-time")
		}
		return t.UTC().Format(time.RFC3339), nil
	case FieldURL:
		s, _ := raw.(string)
		u, err := url.Parse(strings.TrimSpace(s))
		if err != nil || !(u.Scheme == "http" || u.Scheme == "https") || u.Host == "" {
			return nil, fmt.Errorf("must be an absolute http(s) URL")
		}
		return u.String(), nil
	case FieldEmail:
		s, _ := raw.(string)
		a, err := mail.ParseAddress(strings.TrimSpace(s))
		if err != nil || a.Name != "" {
			return nil, fmt.Errorf("must be an email address")
		}
		return a.Address, nil
	case FieldMedia:
		s, _ := raw.(string)
		id, err := uuid.Parse(s)
		if err != nil {
			return nil, fmt.Errorf("must be a media ID")
		}
		return id.String(), nil
	case FieldSelect:
		s, _ := raw.(string)
		for _, o := range f.Options {
			if s == o {
				return s, nil
			}
		}
		return nil, fmt.Errorf("must be one of %s", strings.Join(f.Options, ", "))
	case FieldList:
		items, ok := raw.([]any)
		if !ok {
			return nil, fmt.Errorf("must be an array of strings")
		}
		if len(items) > maxListItems {
			return nil, fmt.Errorf("must have at most %d items", maxListItems)
		}
		out := make([]string, 0, len(items))
		for _, it := range items {
			s, ok := it.(string)
			if !ok {
				return nil, fmt.Errorf("must be an array of strings")
			}
			if s = strings.TrimSpace(s); s != "" {
				if utf8.RuneCountInString(s) > maxTextLen {
					return nil, fmt.Errorf("items must be at most %d characters", maxTextLen)
				}
				out = append(out, s)
			}
		}
		return out, nil
	case FieldGallery:
		items, ok := raw.([]any)
		if !ok {
			return nil, fmt.Errorf("must be a list of media IDs")
		}
		if len(items) > maxListItems {
			return nil, fmt.Errorf("must have at most %d photos", maxListItems)
		}
		out := make([]string, 0, len(items))
		for _, it := range items {
			s, _ := it.(string)
			id, err := uuid.Parse(s)
			if err != nil {
				return nil, fmt.Errorf("must be a list of media IDs")
			}
			out = append(out, id.String())
		}
		return out, nil
	case FieldTable:
		rows, ok := raw.([]any)
		if !ok {
			return nil, fmt.Errorf("must be a list of rows")
		}
		if len(rows) > maxTableRows {
			return nil, fmt.Errorf("must have at most %d rows", maxTableRows)
		}
		out := make([]map[string]any, 0, len(rows))
		for i, r := range rows {
			cells, ok := r.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("row %d must be an object", i+1)
			}
			row := map[string]any{}
			for name := range cells {
				if !f.hasColumn(name) {
					return nil, fmt.Errorf("row %d: unknown column %q", i+1, name)
				}
			}
			for _, c := range f.Columns {
				v, present := cells[c.Name]
				if !present || v == nil || v == "" {
					continue
				}
				cv, err := c.field().coerce(v)
				if err != nil {
					return nil, fmt.Errorf("row %d, %s: %v", i+1, c.Label, err)
				}
				row[c.Name] = cv
			}
			if len(row) > 0 { // skip empty rows
				out = append(out, row)
			}
		}
		return out, nil
	case FieldFlexible:
		items, ok := raw.([]any)
		if !ok {
			return nil, fmt.Errorf("must be a list of sections")
		}
		if len(items) > maxSections {
			return nil, fmt.Errorf("must have at most %d sections", maxSections)
		}
		out := make([]map[string]any, 0, len(items))
		for i, it := range items {
			values, ok := it.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("section %d must be an object", i+1)
			}
			name, _ := values[LayoutKey].(string)
			l, ok := f.layout(name)
			if !ok {
				return nil, fmt.Errorf("section %d: unknown layout %q", i+1, name)
			}
			section, err := l.validate(values)
			if err != nil {
				return nil, fmt.Errorf("section %d (%s), %v", i+1, l.Label, err)
			}
			out = append(out, section)
		}
		return out, nil
	}
	return nil, fmt.Errorf("unsupported field type %q", f.Type)
}

// validate checks one section's values against the layout's fields.
func (l Layout) validate(values map[string]any) (map[string]any, error) {
	out := map[string]any{LayoutKey: l.Name}
	for name := range values {
		if name == LayoutKey {
			continue
		}
		if _, ok := fieldNamed(l.Fields, name); !ok {
			return nil, fmt.Errorf("%s: unknown field", name)
		}
	}
	for _, f := range l.Fields {
		raw, present := values[f.Name]
		if !present || raw == nil || raw == "" {
			if f.Required {
				return nil, fmt.Errorf("%s: is required", f.Label)
			}
			continue
		}
		v, err := f.coerce(raw)
		if err != nil {
			return nil, fmt.Errorf("%s: %v", f.Label, err)
		}
		out[f.Name] = v
	}
	return out, nil
}

func fieldNamed(fields []Field, name string) (Field, bool) {
	for _, f := range fields {
		if f.Name == name {
			return f, true
		}
	}
	return Field{}, false
}

// SanitizeRichText runs sanitize over the rich-text values inside v, a
// validated value of f (only flexible fields hold nested rich text).
func (f Field) SanitizeRichText(v any, sanitize func(string) string) {
	if f.Type != FieldFlexible {
		return
	}
	for _, section := range objects(v) {
		name, _ := section[LayoutKey].(string)
		l, _ := f.layout(name)
		for _, lf := range l.Fields {
			if s, ok := section[lf.Name].(string); ok && lf.Type == FieldRichText {
				section[lf.Name] = sanitize(s)
			}
		}
	}
}

func (f Field) hasColumn(name string) bool {
	for _, c := range f.Columns {
		if c.Name == name {
			return true
		}
	}
	return false
}
