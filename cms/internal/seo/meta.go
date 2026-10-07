// Package seo holds the Yoast-style SEO metadata shared by every content
// entry, plus a pluggable analyzer that scores content against its focus
// keyword and checks readability.
package seo

import (
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
)

// Meta is the SEO metadata every content entry carries (pages, posts and any
// registered content type). It is persisted in cms.seo_data.
type Meta struct {
	MetaTitle       string     `json:"meta_title"`
	MetaDescription string     `json:"meta_description"`
	FocusKeyword    string     `json:"focus_keyword"`
	CanonicalURL    string     `json:"canonical_url"`
	OGTitle         string     `json:"og_title"`
	OGDescription   string     `json:"og_description"`
	OGImageID       *uuid.UUID `json:"og_image_id"`
	// OGImageURL is an alternative to OGImageID for images hosted elsewhere.
	OGImageURL string `json:"og_image_url"`
	// NoIndex asks search engines not to index the entry (robots: noindex).
	NoIndex bool `json:"no_index"`
	// NoFollow asks search engines not to follow links on the entry.
	NoFollow bool `json:"no_follow"`

	// Scores are computed by the analyzer on every save; input is ignored.
	SEOScore         *int `json:"seo_score"`
	ReadabilityScore *int `json:"readability_score"`
}

// Hard limits; recommended lengths are reported by the analyzer instead.
const (
	maxTitleLen       = 300
	maxDescriptionLen = 1000
	maxKeywordLen     = 191
	maxURLLen         = 2048
)

// Normalize trims whitespace from every text field.
func (m *Meta) Normalize() {
	for _, s := range []*string{&m.MetaTitle, &m.MetaDescription, &m.FocusKeyword,
		&m.CanonicalURL, &m.OGTitle, &m.OGDescription, &m.OGImageURL} {
		*s = strings.TrimSpace(*s)
	}
	m.FocusKeyword = strings.Join(strings.Fields(m.FocusKeyword), " ")
}

// Validate returns per-field problems, keyed as "seo.<field>".
func (m Meta) Validate() map[string]string {
	errs := map[string]string{}
	checkLen := func(field, v string, max int) {
		if utf8.RuneCountInString(v) > max {
			errs["seo."+field] = "must be at most " + strconv.Itoa(max) + " characters"
		}
	}
	checkLen("meta_title", m.MetaTitle, maxTitleLen)
	checkLen("og_title", m.OGTitle, maxTitleLen)
	checkLen("meta_description", m.MetaDescription, maxDescriptionLen)
	checkLen("og_description", m.OGDescription, maxDescriptionLen)
	checkLen("focus_keyword", m.FocusKeyword, maxKeywordLen)

	if m.CanonicalURL != "" && !isAbsoluteHTTPURL(m.CanonicalURL) {
		errs["seo.canonical_url"] = "must be an absolute http(s) URL"
	}
	if m.OGImageURL != "" && !isAbsoluteHTTPURL(m.OGImageURL) {
		errs["seo.og_image_url"] = "must be an absolute http(s) URL"
	}
	if m.OGImageID != nil && m.OGImageURL != "" {
		errs["seo.og_image_url"] = "set either og_image_id or og_image_url, not both"
	}
	return errs
}

// Robots renders the robots meta directive.
func (m Meta) Robots() string {
	index, follow := "index", "follow"
	if m.NoIndex {
		index = "noindex"
	}
	if m.NoFollow {
		follow = "nofollow"
	}
	return index + ", " + follow
}

func isAbsoluteHTTPURL(s string) bool {
	if len(s) > maxURLLen {
		return false
	}
	u, err := url.Parse(s)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}
