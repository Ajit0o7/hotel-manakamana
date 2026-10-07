package seo

import (
	"math"
	"sync"
)

// Category groups results the way Yoast does: SEO vs readability.
type Category string

const (
	CategorySEO         Category = "seo"
	CategoryReadability Category = "readability"
)

// Status is the traffic-light rating of a single check.
type Status string

const (
	StatusGood    Status = "good"
	StatusOK      Status = "ok"
	StatusProblem Status = "problem"
)

// Points per status. A score is earned points over the maximum (9 per
// check), as a percentage. Problems earn almost nothing, so a page with
// several of them cannot reach an "ok" rating on the strength of the
// advisory checks alone.
var statusPoints = map[Status]int{StatusGood: 9, StatusOK: 5, StatusProblem: 1}

// Result is the outcome of one check.
type Result struct {
	ID       string   `json:"id"`
	Category Category `json:"category"`
	Status   Status   `json:"status"`
	Message  string   `json:"message"`
}

// Check is one rule of the analysis. Add your own by implementing it and
// passing it to Analyzer.Register.
type Check interface {
	ID() string
	Category() Category
	// Run returns nil when the check does not apply to the document.
	Run(d *Document) *Result
}

// Stats are the raw numbers behind the checks, useful for editor UIs.
type Stats struct {
	WordCount         int      `json:"word_count"`
	SentenceCount     int      `json:"sentence_count"`
	ParagraphCount    int      `json:"paragraph_count"`
	HeadingCount      int      `json:"heading_count"`
	ImageCount        int      `json:"image_count"`
	InternalLinks     int      `json:"internal_links"`
	OutboundLinks     int      `json:"outbound_links"`
	KeywordCount      int      `json:"keyword_count"`
	KeywordDensity    float64  `json:"keyword_density"`
	FleschReadingEase *float64 `json:"flesch_reading_ease"`
	SEOTitleLength    int      `json:"seo_title_length"`
	MetaDescLength    int      `json:"meta_description_length"`
}

// Report is the full analysis of one document.
type Report struct {
	FocusKeyword      string   `json:"focus_keyword"`
	SEOScore          int      `json:"seo_score"`
	SEORating         string   `json:"seo_rating"`
	ReadabilityScore  int      `json:"readability_score"`
	ReadabilityRating string   `json:"readability_rating"`
	Results           []Result `json:"results"`
	Stats             Stats    `json:"stats"`
}

// Analyzer runs a list of checks over content. It is safe for concurrent use.
type Analyzer struct {
	mu       sync.RWMutex
	checks   []Check
	siteHost string
}

// NewAnalyzer returns an analyzer with the default SEO and readability
// checks. siteHost (e.g. "www.hotelmanthali.com") tells internal links apart.
func NewAnalyzer(siteHost string) *Analyzer {
	return &Analyzer{checks: DefaultChecks(), siteHost: siteHost}
}

// Register adds custom checks.
func (a *Analyzer) Register(checks ...Check) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.checks = append(a.checks, checks...)
}

// Analyze parses the input and runs every check.
func (a *Analyzer) Analyze(in Input) Report {
	d := Parse(in, a.siteHost)
	a.mu.RLock()
	checks := a.checks
	a.mu.RUnlock()

	rep := Report{FocusKeyword: d.Input.Meta.FocusKeyword, Results: []Result{}}
	totals := map[Category][2]int{} // earned, possible
	for _, c := range checks {
		r := c.Run(d)
		if r == nil {
			continue
		}
		r.ID, r.Category = c.ID(), c.Category()
		rep.Results = append(rep.Results, *r)
		t := totals[r.Category]
		totals[r.Category] = [2]int{t[0] + statusPoints[r.Status], t[1] + statusPoints[StatusGood]}
	}
	rep.SEOScore, rep.SEORating = score(totals[CategorySEO])
	rep.ReadabilityScore, rep.ReadabilityRating = score(totals[CategoryReadability])
	rep.Stats = computeStats(d)
	return rep
}

func score(t [2]int) (int, string) {
	if t[1] == 0 {
		return 0, "na"
	}
	s := int(math.Round(float64(t[0]) / float64(t[1]) * 100))
	switch {
	case s >= 70:
		return s, "good"
	case s >= 40:
		return s, "ok"
	default:
		return s, "bad"
	}
}

func computeStats(d *Document) Stats {
	st := Stats{
		WordCount:      len(d.Words),
		SentenceCount:  len(d.Sentences),
		ParagraphCount: len(d.Paragraphs),
		HeadingCount:   len(d.Headings),
		ImageCount:     len(d.Images),
		KeywordCount:   CountPhrase(d.Words, d.Keyword),
		SEOTitleLength: runeLen(d.SEOTitle),
		MetaDescLength: runeLen(d.Input.Meta.MetaDescription),
	}
	for _, l := range d.Links {
		if l.Internal {
			st.InternalLinks++
		} else {
			st.OutboundLinks++
		}
	}
	st.KeywordDensity = keywordDensity(d)
	if f, ok := fleschReadingEase(d); ok {
		st.FleschReadingEase = &f
	}
	return st
}

func keywordDensity(d *Document) float64 {
	if len(d.Words) == 0 || len(d.Keyword) == 0 {
		return 0
	}
	n := CountPhrase(d.Words, d.Keyword)
	return math.Round(float64(n)/float64(len(d.Words))*1000) / 10
}

func runeLen(s string) int { return len([]rune(s)) }
