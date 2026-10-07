package seo

import (
	"net/url"
	"strings"
	"unicode"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

// Input is what the analyzer looks at. It mirrors an entry, but is a separate
// type so unsaved drafts can be analyzed too.
type Input struct {
	Title            string `json:"title"`
	Slug             string `json:"slug"`
	Content          string `json:"content"` // HTML
	Excerpt          string `json:"excerpt"`
	HasFeaturedImage bool   `json:"has_featured_image"`
	Meta             Meta   `json:"seo"`
}

// Heading is an h1–h6 element found in the content.
type Heading struct {
	Level int
	Text  string
}

// Image is an <img> found in the content.
type Image struct {
	Src string
	Alt string
}

// Link is an <a href> found in the content.
type Link struct {
	Href     string
	Internal bool
}

// Document is the parsed form of an Input that checks run against.
type Document struct {
	Input Input

	// SEOTitle is the title search engines will show: meta title, else title.
	SEOTitle string
	// Keyword is the focus keyword, lower-cased and split into words.
	Keyword []string

	Text       string   // all visible text
	Words      []string // lower-cased words of Text
	Paragraphs []string
	Sentences  []string
	Headings   []Heading
	Images     []Image
	Links      []Link
}

// Parse builds a Document from an Input. siteHost (e.g. "www.example.com")
// is used to tell internal links from outbound ones; it may be empty.
func Parse(in Input, siteHost string) *Document {
	in.Meta.Normalize()
	d := &Document{Input: in}
	d.SEOTitle = in.Meta.MetaTitle
	if d.SEOTitle == "" {
		d.SEOTitle = strings.TrimSpace(in.Title)
	}
	d.Keyword = Words(in.Meta.FocusKeyword)

	d.walk(in.Content, strings.TrimPrefix(strings.ToLower(siteHost), "www."))
	d.Words = Words(d.Text)
	for _, p := range d.Paragraphs {
		d.Sentences = append(d.Sentences, SplitSentences(p)...)
	}
	return d
}

// blockElements end a run of text: their content becomes its own paragraph.
var blockElements = map[atom.Atom]bool{
	atom.P: true, atom.Li: true, atom.Blockquote: true, atom.Td: true, atom.Th: true,
	atom.Dd: true, atom.Dt: true, atom.Figcaption: true, atom.Pre: true, atom.Div: true,
	atom.Section: true, atom.Article: true,
	atom.H1: true, atom.H2: true, atom.H3: true, atom.H4: true, atom.H5: true, atom.H6: true,
}

var headingLevels = map[atom.Atom]int{
	atom.H1: 1, atom.H2: 2, atom.H3: 3, atom.H4: 4, atom.H5: 5, atom.H6: 6,
}

func (d *Document) walk(content, siteHost string) {
	z := html.NewTokenizer(strings.NewReader(content))
	var (
		all     strings.Builder
		block   strings.Builder // text of the current block
		heading strings.Builder
		inHead  int // heading level we're inside, 0 if none
		skip    int // depth inside <script>/<style>
	)
	flush := func() {
		text := collapseSpace(block.String())
		block.Reset()
		if text == "" {
			return
		}
		if inHead == 0 {
			// Plain-text content without <p> tags: split on blank lines.
			d.Paragraphs = append(d.Paragraphs, splitParagraphs(text)...)
		}
	}

	for {
		tt := z.Next()
		switch tt {
		case html.ErrorToken:
			flush()
			d.Text = collapseSpace(all.String())
			return
		case html.TextToken:
			if skip > 0 {
				continue
			}
			t := html.UnescapeString(string(z.Text()))
			all.WriteString(t)
			if inHead > 0 {
				heading.WriteString(t)
			} else {
				block.WriteString(t)
			}
		case html.StartTagToken, html.SelfClosingTagToken, html.EndTagToken:
			name, hasAttr := z.TagName()
			a := atom.Lookup(name)
			if a == atom.Script || a == atom.Style {
				if tt == html.StartTagToken {
					skip++
				} else if tt == html.EndTagToken && skip > 0 {
					skip--
				}
				continue
			}
			attrs := map[string]string{}
			for hasAttr {
				var k, v []byte
				k, v, hasAttr = z.TagAttr()
				attrs[string(k)] = string(v)
			}
			if blockElements[a] || a == atom.Br {
				all.WriteString("\n")
			}
			if tt == html.EndTagToken {
				if lvl, ok := headingLevels[a]; ok && lvl == inHead {
					d.Headings = append(d.Headings, Heading{Level: lvl, Text: collapseSpace(heading.String())})
					heading.Reset()
					inHead = 0
				} else if blockElements[a] {
					flush()
				}
				continue
			}
			switch {
			case headingLevels[a] > 0:
				flush()
				inHead = headingLevels[a]
			case blockElements[a]:
				flush()
			case a == atom.Br:
				block.WriteString("\n\n")
			case a == atom.Img:
				d.Images = append(d.Images, Image{Src: attrs["src"], Alt: strings.TrimSpace(attrs["alt"])})
			case a == atom.A:
				if href := strings.TrimSpace(attrs["href"]); href != "" {
					d.Links = append(d.Links, Link{Href: href, Internal: isInternal(href, siteHost)})
				}
			}
		}
	}
}

func isInternal(href, siteHost string) bool {
	if strings.HasPrefix(href, "#") || strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") {
		return true
	}
	u, err := url.Parse(href)
	if err != nil {
		return false
	}
	if u.Host == "" {
		return true
	}
	return siteHost != "" && strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.") == siteHost
}

// Words splits s into lower-cased words. Letters, digits and combining marks
// of any script count, so Devanagari text is tokenized correctly.
func Words(s string) []string {
	return strings.FieldsFunc(strings.ToLower(s), func(r rune) bool {
		return !(unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsMark(r) || r == '\'' || r == '’')
	})
}

// SplitSentences splits a paragraph on ., !, ? and the Devanagari danda.
func SplitSentences(p string) []string {
	var out []string
	var cur strings.Builder
	runes := []rune(p)
	for i, r := range runes {
		cur.WriteRune(r)
		if r == '.' || r == '!' || r == '?' || r == '।' {
			// Avoid splitting "3.5" or "e.g." mid-token: require a space or end next.
			if i+1 < len(runes) && !unicode.IsSpace(runes[i+1]) {
				continue
			}
			if s := strings.TrimSpace(cur.String()); len(Words(s)) > 0 {
				out = append(out, s)
			}
			cur.Reset()
		}
	}
	if s := strings.TrimSpace(cur.String()); len(Words(s)) > 0 {
		out = append(out, s)
	}
	return out
}

func splitParagraphs(s string) []string {
	var out []string
	for _, p := range strings.Split(s, "\n\n") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// collapseSpace trims s and squeezes runs of spaces, keeping blank-line
// paragraph breaks ("\n\n") intact.
func collapseSpace(s string) string {
	paras := strings.Split(strings.ReplaceAll(s, "\r\n", "\n"), "\n\n")
	out := paras[:0]
	for _, p := range paras {
		if p = strings.Join(strings.Fields(p), " "); p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, "\n\n")
}

// ContainsPhrase reports whether the word sequence phrase occurs in words.
func ContainsPhrase(words, phrase []string) bool {
	return CountPhrase(words, phrase) > 0
}

// CountPhrase counts non-overlapping occurrences of phrase in words.
func CountPhrase(words, phrase []string) int {
	if len(phrase) == 0 || len(words) < len(phrase) {
		return 0
	}
	n := 0
	for i := 0; i+len(phrase) <= len(words); i++ {
		match := true
		for j := range phrase {
			if words[i+j] != phrase[j] {
				match = false
				break
			}
		}
		if match {
			n++
			i += len(phrase) - 1
		}
	}
	return n
}

// ContainsAllWords reports whether every word of phrase appears in words,
// in any order (a weaker match than ContainsPhrase).
func ContainsAllWords(words, phrase []string) bool {
	if len(phrase) == 0 {
		return false
	}
	set := make(map[string]bool, len(words))
	for _, w := range words {
		set[w] = true
	}
	for _, p := range phrase {
		if !set[p] {
			return false
		}
	}
	return true
}
