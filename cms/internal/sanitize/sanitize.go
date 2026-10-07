// Package sanitize cleans editor HTML before it is stored, so a stolen admin
// session cannot plant scripts that run on the public website.
package sanitize

import "github.com/microcosm-cc/bluemonday"

// Policy is a content.Sanitizer backed by bluemonday.
type Policy struct {
	p *bluemonday.Policy
}

// New returns the default policy: bluemonday's user-generated-content rules
// (headings, lists, tables, links, images, figures...), plus "class"
// attributes for styling and links left followable for SEO. Scripts, styles,
// event handlers, iframes and javascript: URLs are removed.
func New() *Policy {
	p := bluemonday.UGCPolicy()
	p.RequireNoFollowOnLinks(false)
	p.AllowAttrs("class").Globally()
	p.AllowAttrs("loading").Matching(bluemonday.Paragraph).OnElements("img")
	p.AllowAttrs("target").Matching(bluemonday.Paragraph).OnElements("a")
	p.AllowAttrs("rel").Matching(bluemonday.SpaceSeparatedTokens).OnElements("a")
	p.AddTargetBlankToFullyQualifiedLinks(false)
	return &Policy{p: p}
}

// HTML returns s with disallowed markup removed.
func (p *Policy) HTML(s string) string { return p.p.Sanitize(s) }
