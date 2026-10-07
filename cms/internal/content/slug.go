package content

import (
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/text/unicode/norm"
)

const maxSlugLen = 200

// Slugify turns a title into a URL slug. ASCII accents are folded ("Café" →
// "cafe"); other scripts, such as Devanagari, are kept as they are.
func Slugify(s string) string {
	var b strings.Builder
	prevASCII, pendingDash := false, false
	for _, r := range norm.NFD.String(strings.ToLower(s)) {
		switch {
		case unicode.IsMark(r):
			// Drop accents on Latin letters; keep vowel signs etc. elsewhere.
			if !prevASCII {
				b.WriteRune(r)
			}
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			if pendingDash && b.Len() > 0 {
				b.WriteByte('-')
			}
			pendingDash = false
			b.WriteRune(r)
			prevASCII = r < utf8.RuneSelf
		case r == '\'' || r == '’':
			// "Guest's" → "guests"
		default:
			pendingDash = true
		}
	}
	slug := norm.NFC.String(b.String())
	if utf8.RuneCountInString(slug) > maxSlugLen {
		slug = strings.TrimRight(string([]rune(slug)[:maxSlugLen]), "-")
	}
	return slug
}

// ValidSlug reports whether s is already a clean slug: lower-case letters,
// digits and marks separated by single hyphens.
func ValidSlug(s string) bool {
	if s == "" || utf8.RuneCountInString(s) > maxSlugLen || s != norm.NFC.String(s) {
		return false
	}
	prevDash := true // disallow a leading hyphen
	for _, r := range s {
		switch {
		case r == '-':
			if prevDash {
				return false
			}
			prevDash = true
		case unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsMark(r):
			if unicode.IsUpper(r) {
				return false
			}
			prevDash = false
		default:
			return false
		}
	}
	return !prevDash
}
