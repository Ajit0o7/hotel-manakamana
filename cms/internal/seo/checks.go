package seo

import (
	"fmt"
	"math"
	"strings"
	"unicode"
)

// NewCheck adapts a function into a Check, the easiest way to add a rule:
//
//	analyzer.Register(seo.NewCheck("mentions_airport", seo.CategorySEO, func(d *seo.Document) *seo.Result {
//		if seo.ContainsPhrase(d.Words, seo.Words("ramechhap airport")) {
//			return &seo.Result{Status: seo.StatusGood, Message: "Mentions the airport."}
//		}
//		return &seo.Result{Status: seo.StatusOK, Message: "Consider mentioning Ramechhap Airport."}
//	}))
func NewCheck(id string, cat Category, run func(d *Document) *Result) Check {
	return checkFunc{id: id, cat: cat, run: run}
}

type checkFunc struct {
	id  string
	cat Category
	run func(d *Document) *Result
}

func (c checkFunc) ID() string              { return c.id }
func (c checkFunc) Category() Category      { return c.cat }
func (c checkFunc) Run(d *Document) *Result { return c.run(d) }

// Recommended ranges, following Yoast SEO's defaults.
const (
	titleMin, titleMax         = 30, 60
	descMin, descMax           = 120, 156
	densityMin, densityMax     = 0.5, 3.0
	longSentenceWords          = 20
	longParagraphWords         = 150
	veryLongParagraphWords     = 200
	wordsPerSubheading         = 300
	minWordsForDensity         = 100
	minSentencesForTransitions = 5
)

// DefaultChecks returns the built-in SEO and readability checks.
func DefaultChecks() []Check {
	return []Check{
		// SEO
		NewCheck("focus_keyword", CategorySEO, checkFocusKeyword),
		NewCheck("keyword_in_title", CategorySEO, checkKeywordInTitle),
		NewCheck("title_length", CategorySEO, checkTitleLength),
		NewCheck("meta_description_length", CategorySEO, checkMetaDescriptionLength),
		NewCheck("keyword_in_meta_description", CategorySEO, checkKeywordInMetaDescription),
		NewCheck("keyword_in_slug", CategorySEO, checkKeywordInSlug),
		NewCheck("keyword_in_introduction", CategorySEO, checkKeywordInIntroduction),
		NewCheck("keyword_density", CategorySEO, checkKeywordDensity),
		NewCheck("keyword_in_subheadings", CategorySEO, checkKeywordInSubheadings),
		NewCheck("images", CategorySEO, checkImages),
		NewCheck("text_length", CategorySEO, checkTextLength),
		NewCheck("internal_links", CategorySEO, checkInternalLinks),
		NewCheck("outbound_links", CategorySEO, checkOutboundLinks),
		NewCheck("social_preview", CategorySEO, checkSocialPreview),
		NewCheck("indexability", CategorySEO, checkIndexability),
		// Readability
		NewCheck("sentence_length", CategoryReadability, checkSentenceLength),
		NewCheck("paragraph_length", CategoryReadability, checkParagraphLength),
		NewCheck("subheading_distribution", CategoryReadability, checkSubheadingDistribution),
		NewCheck("flesch_reading_ease", CategoryReadability, checkFlesch),
		NewCheck("consecutive_sentences", CategoryReadability, checkConsecutiveSentences),
		NewCheck("transition_words", CategoryReadability, checkTransitionWords),
	}
}

func good(format string, a ...any) *Result {
	return &Result{Status: StatusGood, Message: fmt.Sprintf(format, a...)}
}
func ok(format string, a ...any) *Result {
	return &Result{Status: StatusOK, Message: fmt.Sprintf(format, a...)}
}
func problem(format string, a ...any) *Result {
	return &Result{Status: StatusProblem, Message: fmt.Sprintf(format, a...)}
}

func checkFocusKeyword(d *Document) *Result {
	switch n := len(d.Keyword); {
	case n == 0:
		return problem("No focus keyword set. Add the phrase you want this content to rank for.")
	case n > 4:
		return ok("The focus keyword has %d words. Shorter keyphrases (up to 4 words) are easier to rank for.", n)
	default:
		return good("Focus keyword set: %q.", d.Input.Meta.FocusKeyword)
	}
}

func checkKeywordInTitle(d *Document) *Result {
	if len(d.Keyword) == 0 {
		return nil
	}
	title := Words(d.SEOTitle)
	switch {
	case len(title) >= len(d.Keyword) && ContainsPhrase(title[:len(d.Keyword)], d.Keyword):
		return good("The SEO title starts with the focus keyword.")
	case ContainsPhrase(title, d.Keyword):
		return ok("The SEO title contains the focus keyword. Moving it to the beginning can help.")
	case ContainsAllWords(title, d.Keyword):
		return ok("The SEO title contains every word of the focus keyword, but not as an exact phrase.")
	default:
		return problem("The SEO title does not contain the focus keyword.")
	}
}

func checkTitleLength(d *Document) *Result {
	switch n := runeLen(d.SEOTitle); {
	case n == 0:
		return problem("No SEO title. Add a title or a meta title.")
	case n < titleMin:
		return ok("The SEO title is short (%d characters). Use up to %d to make the most of the space.", n, titleMax)
	case n <= titleMax:
		return good("The SEO title length (%d characters) is good.", n)
	default:
		return ok("The SEO title is %d characters long and may be cut off in search results (aim for at most %d).", n, titleMax)
	}
}

func checkMetaDescriptionLength(d *Document) *Result {
	switch n := runeLen(d.Input.Meta.MetaDescription); {
	case n == 0:
		return problem("No meta description. Search engines will pick a snippet from the page instead.")
	case n < descMin:
		return ok("The meta description is short (%d characters). Aim for %d–%d.", n, descMin, descMax)
	case n <= descMax:
		return good("The meta description length (%d characters) is good.", n)
	default:
		return ok("The meta description is %d characters and may be cut off (aim for at most %d).", n, descMax)
	}
}

func checkKeywordInMetaDescription(d *Document) *Result {
	if len(d.Keyword) == 0 || d.Input.Meta.MetaDescription == "" {
		return nil
	}
	if ContainsPhrase(Words(d.Input.Meta.MetaDescription), d.Keyword) {
		return good("The meta description contains the focus keyword.")
	}
	return problem("The meta description does not contain the focus keyword.")
}

func checkKeywordInSlug(d *Document) *Result {
	if len(d.Keyword) == 0 || d.Input.Slug == "" {
		return nil
	}
	if ContainsAllWords(Words(strings.ReplaceAll(d.Input.Slug, "-", " ")), d.Keyword) {
		return good("The slug contains the focus keyword.")
	}
	return ok("The slug does not contain the focus keyword.")
}

func checkKeywordInIntroduction(d *Document) *Result {
	if len(d.Keyword) == 0 || len(d.Paragraphs) == 0 {
		return nil
	}
	intro := Words(d.Paragraphs[0])
	switch {
	case ContainsPhrase(intro, d.Keyword):
		return good("The focus keyword appears in the first paragraph.")
	case ContainsAllWords(intro, d.Keyword):
		return ok("The first paragraph contains the focus keyword's words, but not as an exact phrase.")
	default:
		return problem("The focus keyword does not appear in the first paragraph. Mention it early.")
	}
}

func checkKeywordDensity(d *Document) *Result {
	if len(d.Keyword) == 0 || len(d.Words) < minWordsForDensity {
		return nil
	}
	count := CountPhrase(d.Words, d.Keyword)
	density := keywordDensity(d)
	switch {
	case count == 0:
		return problem("The focus keyword does not appear in the text.")
	case density < densityMin:
		return ok("The focus keyword appears %d time(s) (%.1f%%). Use it a little more (aim for %.1f–%.1f%%).", count, density, densityMin, densityMax)
	case density <= densityMax:
		return good("Keyword density is %.1f%% (%d times). Nice.", density, count)
	default:
		return problem("Keyword density is %.1f%% (%d times), which reads as keyword stuffing. Aim for at most %.1f%%.", density, count, densityMax)
	}
}

func subheadings(d *Document) []Heading {
	var out []Heading
	for _, h := range d.Headings {
		if h.Level == 2 || h.Level == 3 {
			out = append(out, h)
		}
	}
	return out
}

func checkKeywordInSubheadings(d *Document) *Result {
	subs := subheadings(d)
	if len(d.Keyword) == 0 || len(subs) == 0 {
		return nil
	}
	n := 0
	for _, h := range subs {
		if ContainsAllWords(Words(h.Text), d.Keyword) {
			n++
		}
	}
	ratio := float64(n) / float64(len(subs))
	switch {
	case n == 0:
		return ok("None of the H2/H3 subheadings mention the focus keyword.")
	case ratio > 0.75 && len(subs) > 1:
		return ok("%d of %d subheadings mention the focus keyword. That can feel repetitive; vary them a bit.", n, len(subs))
	case ratio < 0.3:
		return ok("Only %d of %d subheadings mention the focus keyword.", n, len(subs))
	default:
		return good("%d of %d subheadings mention the focus keyword.", n, len(subs))
	}
}

func checkImages(d *Document) *Result {
	if len(d.Images) == 0 {
		if d.Input.HasFeaturedImage {
			return ok("No images in the text. A photo or two keeps readers engaged.")
		}
		return ok("No images. Add at least one relevant photo.")
	}
	missing, withKeyword := 0, 0
	for _, img := range d.Images {
		if img.Alt == "" {
			missing++
		} else if len(d.Keyword) > 0 && ContainsAllWords(Words(img.Alt), d.Keyword) {
			withKeyword++
		}
	}
	switch {
	case missing > 0:
		return problem("%d of %d images have no alt text. Describe every image for accessibility and image search.", missing, len(d.Images))
	case len(d.Keyword) > 0 && withKeyword == 0:
		return ok("All images have alt text, but none mention the focus keyword.")
	default:
		return good("All images have alt text.")
	}
}

func checkTextLength(d *Document) *Result {
	switch n := len(d.Words); {
	case n < 100:
		return problem("The text has %d words. Thin content rarely ranks; aim for 300 or more.", n)
	case n < 300:
		return ok("The text has %d words. Consider expanding it to 300 or more.", n)
	default:
		return good("The text has %d words. Good length.", n)
	}
}

func checkInternalLinks(d *Document) *Result {
	n := 0
	for _, l := range d.Links {
		if l.Internal && !strings.HasPrefix(l.Href, "#") {
			n++
		}
	}
	if n == 0 {
		return ok("No internal links. Link to related rooms, pages or posts.")
	}
	return good("%d internal link(s).", n)
}

func checkOutboundLinks(d *Document) *Result {
	n := 0
	for _, l := range d.Links {
		if !l.Internal {
			n++
		}
	}
	if n == 0 {
		return ok("No outbound links. Linking to a useful outside source can help readers.")
	}
	return good("%d outbound link(s).", n)
}

func checkSocialPreview(d *Document) *Result {
	m := d.Input.Meta
	if m.OGImageID == nil && m.OGImageURL == "" && !d.Input.HasFeaturedImage {
		return ok("No Open Graph or featured image. Shared links will appear without a picture.")
	}
	return good("A social sharing image is set.")
}

func checkIndexability(d *Document) *Result {
	if d.Input.Meta.NoIndex {
		return problem("This entry is set to noindex, so search engines will not show it.")
	}
	return nil
}

func checkSentenceLength(d *Document) *Result {
	if len(d.Sentences) == 0 {
		return nil
	}
	long := 0
	for _, s := range d.Sentences {
		if len(Words(s)) > longSentenceWords {
			long++
		}
	}
	pct := float64(long) / float64(len(d.Sentences)) * 100
	switch {
	case pct <= 25:
		return good("%.0f%% of sentences are longer than %d words. Good.", pct, longSentenceWords)
	case pct <= 30:
		return ok("%.0f%% of sentences are longer than %d words (aim for at most 25%%).", pct, longSentenceWords)
	default:
		return problem("%.0f%% of sentences are longer than %d words. Split some of them up (aim for at most 25%%).", pct, longSentenceWords)
	}
}

func checkParagraphLength(d *Document) *Result {
	if len(d.Paragraphs) == 0 {
		return nil
	}
	longest, tooLong := 0, 0
	for _, p := range d.Paragraphs {
		n := len(Words(p))
		longest = max(longest, n)
		if n > longParagraphWords {
			tooLong++
		}
	}
	switch {
	case longest > veryLongParagraphWords:
		return problem("%d paragraph(s) are longer than %d words; the longest has %d. Break them up.", tooLong, longParagraphWords, longest)
	case longest > longParagraphWords:
		return ok("%d paragraph(s) are longer than %d words.", tooLong, longParagraphWords)
	default:
		return good("No paragraph is too long.")
	}
}

func checkSubheadingDistribution(d *Document) *Result {
	n := len(d.Words)
	subs := 0
	for _, h := range d.Headings {
		if h.Level >= 2 {
			subs++
		}
	}
	switch {
	case n <= wordsPerSubheading && subs == 0:
		return nil
	case subs == 0:
		return problem("The text has %d words and no subheadings. Add H2/H3 headings to break it up.", n)
	case n/(subs+1) > wordsPerSubheading:
		return ok("Sections average %d words. Add subheadings so no section runs over %d words.", n/(subs+1), wordsPerSubheading)
	default:
		return good("Subheadings are well distributed.")
	}
}

func checkFlesch(d *Document) *Result {
	f, applies := fleschReadingEase(d)
	if !applies {
		return nil
	}
	switch {
	case f >= 60:
		return good("Flesch reading ease is %.0f: easy to read.", f)
	case f >= 50:
		return ok("Flesch reading ease is %.0f: fairly difficult. Use shorter sentences and simpler words.", f)
	default:
		return problem("Flesch reading ease is %.0f: difficult to read. Use shorter sentences and simpler words.", f)
	}
}

func checkConsecutiveSentences(d *Document) *Result {
	if len(d.Sentences) < 3 {
		return nil
	}
	run, worst := 1, 1
	prev := ""
	for _, s := range d.Sentences {
		w := Words(s)
		first := ""
		if len(w) > 0 {
			first = w[0]
		}
		if first != "" && first == prev {
			run++
		} else {
			run = 1
		}
		worst = max(worst, run)
		prev = first
	}
	if worst >= 3 {
		return problem("%d sentences in a row start with the same word. Vary your sentence openings.", worst)
	}
	return good("Sentence openings are varied.")
}

func checkTransitionWords(d *Document) *Result {
	if len(d.Sentences) < minSentencesForTransitions || !mostlyLatin(d.Text) {
		return nil
	}
	n := 0
	for _, s := range d.Sentences {
		if hasTransition(" " + strings.Join(Words(s), " ") + " ") {
			n++
		}
	}
	pct := float64(n) / float64(len(d.Sentences)) * 100
	switch {
	case pct >= 30:
		return good("%.0f%% of sentences use transition words. Good flow.", pct)
	case pct >= 20:
		return ok("%.0f%% of sentences use transition words (aim for 30%% or more).", pct)
	default:
		return problem("Only %.0f%% of sentences use transition words such as \"however\", \"also\" or \"for example\".", pct)
	}
}

var transitionWords = []string{
	"also", "besides", "furthermore", "moreover", "additionally", "however", "but", "although",
	"though", "yet", "instead", "nevertheless", "therefore", "thus", "hence", "consequently",
	"so", "because", "since", "first", "second", "third", "finally", "then", "next", "afterwards",
	"meanwhile", "later", "before", "after", "for example", "for instance", "such as", "in fact",
	"in addition", "as a result", "on the other hand", "in contrast", "similarly", "likewise",
	"overall", "in short", "in conclusion", "especially", "particularly", "above all", "of course",
	"while", "whereas", "unlike", "in other words", "that is", "even so", "as well as",
}

func hasTransition(padded string) bool {
	for _, t := range transitionWords {
		if strings.Contains(padded, " "+t+" ") {
			return true
		}
	}
	return false
}

// fleschReadingEase computes the English Flesch score. It is skipped for
// text that is not mostly Latin script (e.g. Nepali), where it means nothing.
func fleschReadingEase(d *Document) (float64, bool) {
	if len(d.Words) < 50 || len(d.Sentences) == 0 || !mostlyLatin(d.Text) {
		return 0, false
	}
	syllables := 0
	for _, w := range d.Words {
		syllables += countSyllables(w)
	}
	words, sentences := float64(len(d.Words)), float64(len(d.Sentences))
	f := 206.835 - 1.015*(words/sentences) - 84.6*(float64(syllables)/words)
	return math.Round(math.Max(0, math.Min(100, f))*10) / 10, true
}

func mostlyLatin(s string) bool {
	latin, letters := 0, 0
	for _, r := range s {
		if unicode.IsLetter(r) {
			letters++
			if unicode.Is(unicode.Latin, r) {
				latin++
			}
		}
	}
	return letters > 0 && float64(latin)/float64(letters) >= 0.8
}

// countSyllables is the usual English vowel-group heuristic.
func countSyllables(word string) int {
	w := strings.Trim(strings.ToLower(word), "'’")
	if len(w) <= 3 {
		return 1
	}
	isVowel := func(r rune) bool { return strings.ContainsRune("aeiouy", r) }
	count, prevVowel := 0, false
	for _, r := range w {
		v := isVowel(r)
		if v && !prevVowel {
			count++
		}
		prevVowel = v
	}
	if strings.HasSuffix(w, "e") && !strings.HasSuffix(w, "le") && count > 1 {
		count--
	}
	if strings.HasSuffix(w, "es") || strings.HasSuffix(w, "ed") {
		if count > 1 && !strings.HasSuffix(w, "ted") && !strings.HasSuffix(w, "ded") {
			count--
		}
	}
	return max(count, 1)
}
