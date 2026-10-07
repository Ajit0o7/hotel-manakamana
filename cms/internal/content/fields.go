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
)

var knownFieldTypes = map[FieldType]bool{
	FieldText: true, FieldTextarea: true, FieldRichText: true, FieldNumber: true,
	FieldInteger: true, FieldBoolean: true, FieldDate: true, FieldDateTime: true,
	FieldURL: true, FieldEmail: true, FieldMedia: true, FieldSelect: true, FieldList: true,
}

// Field declares one custom field of a content type.
type Field struct {
	Name     string    `json:"name"`
	Label    string    `json:"label"`
	Type     FieldType `json:"type"`
	Required bool      `json:"required,omitempty"`
	Help     string    `json:"help,omitempty"`
	// Options are the allowed values of a select field.
	Options []string `json:"options,omitempty"`
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
	return nil
}

const (
	maxTextLen     = 500
	maxLongTextLen = 100_000
	maxListItems   = 100
)

// ValidateFields checks values against the type's field definitions and
// returns the normalized values plus per-field errors keyed "fields.<name>".
// Unknown fields are rejected so typos do not silently disappear.
func (ct ContentType) ValidateFields(values map[string]any) (map[string]any, map[string]string) {
	out := map[string]any{}
	errs := map[string]string{}
	for name := range values {
		if _, ok := ct.Field(name); !ok {
			errs["fields."+name] = "unknown field"
		}
	}
	for _, f := range ct.Fields {
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
		out[f.Name] = v
	}
	return out, errs
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
	}
	return nil, fmt.Errorf("unsupported field type %q", f.Type)
}
