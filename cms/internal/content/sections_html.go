package content

import (
	"html"
	"regexp"
	"strings"
)

// SectionsHTML turns the text in the flexible fields of an entry into simple
// HTML (headings, paragraphs, links), so the SEO analysis sees the words a
// visitor sees, not only the body.
func (ct ContentType) SectionsHTML(template string, fields map[string]any) string {
	var b strings.Builder
	for _, f := range ct.FieldsFor(template) {
		if f.Type != FieldFlexible {
			continue
		}
		for _, section := range objects(fields[f.Name]) {
			name, _ := section[LayoutKey].(string)
			l, _ := f.layout(name)
			for _, lf := range l.Fields {
				writeSectionText(&b, lf, section[lf.Name])
			}
		}
	}
	return b.String()
}

// SectionsHTML is ContentType.SectionsHTML for a type name; unknown types give "".
func (s *Service) SectionsHTML(typ, template string, fields map[string]any) string {
	ct, ok := s.Types.Get(typ)
	if !ok {
		return ""
	}
	return ct.SectionsHTML(template, fields)
}

func writeSectionText(b *strings.Builder, f Field, v any) {
	switch f.Type {
	case FieldRichText:
		if s, ok := v.(string); ok {
			b.WriteString(s)
		}
	case FieldText, FieldTextarea:
		s, _ := v.(string)
		if s == "" || looksLikeLink(s) {
			return
		}
		if f.Name == "heading" {
			b.WriteString("<h2>" + inlineHTML(strings.ReplaceAll(s, "\n", " ")) + "</h2>")
			return
		}
		for _, p := range strings.Split(s, "\n\n") {
			if p = strings.TrimSpace(p); p != "" {
				b.WriteString("<p>" + inlineHTML(p) + "</p>")
			}
		}
	case FieldList:
		switch items := v.(type) {
		case []string:
			for _, it := range items {
				b.WriteString("<p>" + inlineHTML(it) + "</p>")
			}
		case []any:
			for _, it := range items {
				if s, ok := it.(string); ok {
					b.WriteString("<p>" + inlineHTML(s) + "</p>")
				}
			}
		}
	case FieldTable:
		for _, row := range objects(v) {
			for _, c := range f.Columns {
				if c.Type == "" || c.Type == FieldText || c.Type == FieldTextarea {
					writeSectionText(b, Field{Name: c.Name, Type: FieldTextarea}, row[c.Name])
				}
			}
		}
	}
}

func looksLikeLink(s string) bool {
	return strings.HasPrefix(s, "/") || strings.HasPrefix(s, "#") || strings.HasPrefix(s, "tel:") ||
		strings.HasPrefix(s, "mailto:") || strings.Contains(s, "://") || (strings.HasPrefix(s, "{") && strings.HasSuffix(s, "}"))
}

var (
	mdLink   = regexp.MustCompile(`\[([^\]]+)\]\(([^)\s]+)\)`)
	mdAccent = regexp.MustCompile(`\*+`)
)

// inlineHTML escapes s and turns [label](href) into links; *stars* are dropped.
func inlineHTML(s string) string {
	var b strings.Builder
	last := 0
	for _, m := range mdLink.FindAllStringSubmatchIndex(s, -1) {
		b.WriteString(html.EscapeString(mdAccent.ReplaceAllString(s[last:m[0]], "")))
		label, href := s[m[2]:m[3]], s[m[4]:m[5]]
		b.WriteString(`<a href="` + html.EscapeString(href) + `">` + html.EscapeString(mdAccent.ReplaceAllString(label, "")) + "</a>")
		last = m[1]
	}
	b.WriteString(html.EscapeString(mdAccent.ReplaceAllString(s[last:], "")))
	return b.String()
}
