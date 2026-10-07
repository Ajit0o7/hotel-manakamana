package seo

import (
	"strings"
	"testing"
)

func resultByID(rep Report, id string) *Result {
	for i := range rep.Results {
		if rep.Results[i].ID == id {
			return &rep.Results[i]
		}
	}
	return nil
}

var goodArticle = `
<p>Our hotel near Ramechhap Airport is the easiest place to stay before an early Lukla flight. Rooms are quiet, clean and only a short walk from the terminal.</p>
<h2>Why stay near Ramechhap Airport</h2>
<p>Flights to Lukla leave at dawn. However, the road from Kathmandu takes five hours or more, so most trekkers arrive the evening before. Staying close means you can sleep longer and still reach the check-in desk on time.</p>
<p>We also store luggage for guests who are trekking. In addition, our team can confirm your flight time with the airline the night before.</p>
<img src="/images/terrace.jpg" alt="Rooftop terrace at our hotel near Ramechhap Airport">
<h2>Rooms and meals</h2>
<p>Each room has hot water, fast Wi-Fi and a view of the runway. For example, the deluxe double room fits two adults and a child. Breakfast starts at five so you never fly hungry.</p>
<p>Dinner is a classic dal bhat set. Furthermore, the kitchen packs lunch boxes for the trail on request. See our <a href="/rooms">rooms</a> or read the <a href="https://www.caanepal.gov.np">airport authority</a> notices.</p>
<h3>Getting here</h3>
<p>Take the Sindhuli highway east. Then turn at Manthali bazaar and follow the signs. The hotel is on the left, opposite the airport gate. Finally, call us if you get lost and we will guide you in.</p>
` + filler

// filler pads the article past 300 words with short, simple sentences.
var filler = strings.Repeat("<p>The staff are kind and the town is calm. Also, the food is fresh and the beds are soft. Then you rest well before the flight.</p>\n", 12)

func TestAnalyzeGoodContent(t *testing.T) {
	a := NewAnalyzer("www.hotelmanthali.com")
	rep := a.Analyze(Input{
		Title:   "Hotel near Ramechhap Airport",
		Slug:    "hotel-near-ramechhap-airport",
		Content: goodArticle,
		Meta: Meta{
			FocusKeyword:    "Ramechhap Airport",
			MetaTitle:       "Ramechhap Airport Hotel | Stay Before Your Lukla Flight",
			MetaDescription: "Sleep steps from Ramechhap Airport before your Lukla flight. Quiet rooms, early breakfast, luggage storage and friendly help with flight times.",
		},
		HasFeaturedImage: true,
	})

	if rep.SEOScore < 80 || rep.SEORating != "good" {
		t.Errorf("SEO score = %d (%s), want good ≥ 80; results: %+v", rep.SEOScore, rep.SEORating, rep.Results)
	}
	if rep.ReadabilityRating != "good" {
		t.Errorf("readability = %d (%s), want good; results: %+v", rep.ReadabilityScore, rep.ReadabilityRating, rep.Results)
	}
	for id, want := range map[string]Status{
		"keyword_in_title":            StatusGood,
		"keyword_in_meta_description": StatusGood,
		"keyword_in_slug":             StatusGood,
		"keyword_in_introduction":     StatusGood,
		"images":                      StatusGood,
		"internal_links":              StatusGood,
		"outbound_links":              StatusGood,
		"text_length":                 StatusGood,
	} {
		r := resultByID(rep, id)
		if r == nil {
			t.Errorf("%s: missing result", id)
			continue
		}
		if r.Status != want {
			t.Errorf("%s = %s (%s), want %s", id, r.Status, r.Message, want)
		}
	}
	if rep.Stats.InternalLinks != 1 || rep.Stats.OutboundLinks != 1 {
		t.Errorf("links = %d internal / %d outbound, want 1/1", rep.Stats.InternalLinks, rep.Stats.OutboundLinks)
	}
	if rep.Stats.FleschReadingEase == nil {
		t.Error("expected a Flesch score for English text")
	}
}

func TestAnalyzeWeakContent(t *testing.T) {
	a := NewAnalyzer("")
	rep := a.Analyze(Input{
		Title:   "Welcome",
		Slug:    "welcome",
		Content: `<p>Hello.</p><img src="/x.jpg">`,
		Meta:    Meta{FocusKeyword: "mountain view rooms", NoIndex: true},
	})
	if rep.SEORating != "bad" {
		t.Errorf("rating = %s (%d), want bad", rep.SEORating, rep.SEOScore)
	}
	for id, want := range map[string]Status{
		"keyword_in_title":        StatusProblem,
		"meta_description_length": StatusProblem,
		"keyword_in_introduction": StatusProblem,
		"images":                  StatusProblem,
		"text_length":             StatusProblem,
		"indexability":            StatusProblem,
	} {
		if r := resultByID(rep, id); r == nil || r.Status != want {
			t.Errorf("%s = %+v, want %s", id, r, want)
		}
	}
	if r := resultByID(rep, "keyword_in_meta_description"); r != nil {
		t.Errorf("keyword_in_meta_description should be skipped without a description, got %+v", r)
	}
}

func TestAnalyzeWithoutKeyword(t *testing.T) {
	rep := NewAnalyzer("").Analyze(Input{Title: "About us", Content: "<p>Family run since 2010.</p>"})
	if r := resultByID(rep, "focus_keyword"); r == nil || r.Status != StatusProblem {
		t.Errorf("focus_keyword = %+v, want problem", r)
	}
	for _, id := range []string{"keyword_in_title", "keyword_density", "keyword_in_slug"} {
		if resultByID(rep, id) != nil {
			t.Errorf("%s should be skipped without a focus keyword", id)
		}
	}
}

func TestKeywordStuffing(t *testing.T) {
	text := "<p>" + strings.Repeat("Ramechhap hotel is great. ", 40) + "</p>"
	rep := NewAnalyzer("").Analyze(Input{Title: "Ramechhap hotel", Content: text, Meta: Meta{FocusKeyword: "ramechhap hotel"}})
	if r := resultByID(rep, "keyword_density"); r == nil || r.Status != StatusProblem {
		t.Errorf("keyword_density = %+v, want problem for stuffing", r)
	}
	if r := resultByID(rep, "consecutive_sentences"); r == nil || r.Status != StatusProblem {
		t.Errorf("consecutive_sentences = %+v, want problem", r)
	}
}

func TestCustomCheck(t *testing.T) {
	a := NewAnalyzer("")
	a.Register(NewCheck("mentions_lukla", CategorySEO, func(d *Document) *Result {
		if ContainsPhrase(d.Words, Words("lukla")) {
			return &Result{Status: StatusGood, Message: "mentions Lukla"}
		}
		return &Result{Status: StatusOK, Message: "consider mentioning Lukla"}
	}))
	rep := a.Analyze(Input{Title: "x", Content: "<p>Fly to Lukla.</p>"})
	if r := resultByID(rep, "mentions_lukla"); r == nil || r.Status != StatusGood || r.Category != CategorySEO {
		t.Errorf("custom check result = %+v", r)
	}
}

func TestParseDocument(t *testing.T) {
	d := Parse(Input{Content: `
		<h1>Title</h1>
		<p>First <strong>para</strong>. Second sentence!</p>
		<script>var hidden = "nope";</script>
		<ul><li>One item</li><li>Two</li></ul>
		<h2>Sub <em>heading</em></h2>
		<p>Line one<br>Line two</p>
		<a href="https://hotelmanthali.com/x">in</a><a href="https://other.example/">out</a><a href="#top">anchor</a>
	`}, "www.hotelmanthali.com")

	if len(d.Headings) != 2 || d.Headings[1] != (Heading{Level: 2, Text: "Sub heading"}) {
		t.Errorf("headings = %+v", d.Headings)
	}
	wantParas := []string{"First para. Second sentence!", "One item", "Two", "Line one", "Line two", "inoutanchor"}
	if strings.Join(d.Paragraphs, "|") != strings.Join(wantParas, "|") {
		t.Errorf("paragraphs = %q, want %q", d.Paragraphs, wantParas)
	}
	if strings.Contains(d.Text, "nope") {
		t.Error("script content leaked into text")
	}
	if len(d.Sentences) < 2 || d.Sentences[0] != "First para." {
		t.Errorf("sentences = %q", d.Sentences)
	}
	if len(d.Links) != 3 || !d.Links[0].Internal || d.Links[1].Internal || !d.Links[2].Internal {
		t.Errorf("links = %+v", d.Links)
	}
}

func TestWordsHandlesDevanagari(t *testing.T) {
	w := Words("मनकामना होटल, Manthali!")
	if len(w) != 3 || w[0] != "मनकामना" || w[2] != "manthali" {
		t.Errorf("Words = %q", w)
	}
	s := SplitSentences("पहिलो वाक्य। दोस्रो वाक्य।")
	if len(s) != 2 {
		t.Errorf("SplitSentences = %q", s)
	}
	// Flesch is meaningless for Nepali and must be skipped.
	rep := NewAnalyzer("").Analyze(Input{Title: "x", Content: "<p>" + strings.Repeat("पहिलो वाक्य यहाँ छ। ", 30) + "</p>"})
	if rep.Stats.FleschReadingEase != nil || resultByID(rep, "flesch_reading_ease") != nil {
		t.Error("Flesch should be skipped for non-Latin text")
	}
}

func TestPhraseMatching(t *testing.T) {
	words := Words("Book a deluxe double room near the airport; the double room is quiet.")
	if got := CountPhrase(words, Words("double room")); got != 2 {
		t.Errorf("CountPhrase = %d, want 2", got)
	}
	if ContainsPhrase(words, Words("room double")) {
		t.Error("ContainsPhrase should respect word order")
	}
	if !ContainsAllWords(words, Words("room double")) {
		t.Error("ContainsAllWords should ignore word order")
	}
}

func TestMetaValidate(t *testing.T) {
	m := Meta{CanonicalURL: "/relative", OGImageURL: "ftp://x", MetaTitle: strings.Repeat("a", 301)}
	errs := m.Validate()
	for _, k := range []string{"seo.canonical_url", "seo.og_image_url", "seo.meta_title"} {
		if errs[k] == "" {
			t.Errorf("expected error for %s, got %v", k, errs)
		}
	}
	if errs := (Meta{CanonicalURL: "https://www.hotelmanthali.com/"}).Validate(); len(errs) != 0 {
		t.Errorf("unexpected errors: %v", errs)
	}
	if got := (Meta{NoIndex: true}).Robots(); got != "noindex, follow" {
		t.Errorf("Robots = %q", got)
	}
}

func TestCountSyllables(t *testing.T) {
	for word, want := range map[string]int{"the": 1, "hotel": 2, "airport": 2, "beautiful": 3, "make": 1, "table": 2} {
		if got := countSyllables(word); got != want {
			t.Errorf("countSyllables(%q) = %d, want %d", word, got, want)
		}
	}
}
