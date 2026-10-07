package content

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSlugify(t *testing.T) {
	for in, want := range map[string]string{
		"Deluxe Double Room":             "deluxe-double-room",
		"  Café & Rooftop  ":             "cafe-rooftop",
		"Guest's Guide: Lukla Flights!!": "guests-guide-lukla-flights",
		"Ramechhap -- Airport":           "ramechhap-airport",
		"मनकामना होटल":                   "मनकामना-होटल",
		"2026 Offers":                    "2026-offers",
		"!!!":                            "",
	} {
		if got := Slugify(in); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
		if want != "" && !ValidSlug(want) {
			t.Errorf("ValidSlug(%q) = false", want)
		}
	}
	for _, bad := range []string{"", "-a", "a-", "a--b", "A", "a b", "a/b", "a_b"} {
		if ValidSlug(bad) {
			t.Errorf("ValidSlug(%q) = true, want false", bad)
		}
	}
}

func TestValidateFields(t *testing.T) {
	out, errs := PostType.ValidateFields(map[string]any{
		"eyebrow":           "Offer",
		"tags":              []any{" trekking ", "lukla", ""},
		"offer_valid_until": "2026-12-31",
		"offer_price_npr":   4500.0,
	}, "offer")
	if len(errs) != 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if tags := out["tags"].([]string); len(tags) != 2 || tags[0] != "trekking" {
		t.Errorf("tags = %q", tags)
	}

	// Template fields only exist for their template.
	_, errs = PostType.ValidateFields(map[string]any{"offer_price_npr": 4500.0}, "guide")
	if errs["fields.offer_price_npr"] != "unknown field" {
		t.Errorf("offer field accepted on a guide: %v", errs)
	}

	_, errs = PostType.ValidateFields(map[string]any{
		"offer_valid_until": "31/12/2026",
		"offer_price_npr":   "cheap",
		"colour":            "red",
	}, "offer")
	for _, k := range []string{"fields.offer_valid_until", "fields.offer_price_npr", "fields.colour"} {
		if errs[k] == "" {
			t.Errorf("expected error for %s; got %v", k, errs)
		}
	}

	required := ContentType{Name: "room", Label: "Room", Fields: []Field{
		{Name: "beds", Label: "Beds", Type: FieldInteger, Required: true},
		{Name: "booking_url", Label: "Booking URL", Type: FieldURL},
	}}
	_, errs = required.ValidateFields(map[string]any{"booking_url": "javascript:alert(1)"}, "")
	if errs["fields.beds"] != "is required" || errs["fields.booking_url"] == "" {
		t.Errorf("errs = %v", errs)
	}
	out, errs = required.ValidateFields(map[string]any{"beds": 2.0}, "")
	if len(errs) != 0 || out["beds"] != int64(2) {
		t.Errorf("out = %v, errs = %v", out, errs)
	}
	if _, errs = required.ValidateFields(map[string]any{"beds": 2.5}, ""); errs["fields.beds"] == "" {
		t.Error("2.5 should not be accepted as an integer")
	}
}

func TestRegistry(t *testing.T) {
	r := NewRegistry()
	r.MustRegister(PageType)
	r.MustRegister(PostType)
	if err := r.Register(PageType); err == nil {
		t.Error("duplicate registration should fail")
	}
	for _, bad := range []ContentType{
		{Name: "Bad Name", Label: "x"},
		{Name: "room"},
		{Name: "room", Label: "Room", RoutePrefix: "rooms"},
		{Name: "room", Label: "Room", Fields: []Field{{Name: "x", Type: "colour"}}},
		{Name: "room", Label: "Room", Fields: []Field{{Name: "x", Type: FieldSelect}}},
	} {
		if err := r.Register(bad); err == nil {
			t.Errorf("Register(%+v) should fail", bad)
		}
	}
	if names := typeNames(r.All()); names != "page,post" {
		t.Errorf("All() = %s", names)
	}

	file := filepath.Join(t.TempDir(), "types.json")
	os.WriteFile(file, []byte(`[{"name":"room","label":"Room","route_prefix":"/rooms",
		"fields":[{"name":"price_npr","label":"Price","type":"number","required":true}]}]`), 0o600)
	if err := r.LoadFile(file); err != nil {
		t.Fatal(err)
	}
	room, ok := r.Get("room")
	if !ok || room.LabelPlural != "Rooms" || len(room.Fields) != 1 {
		t.Errorf("room = %+v", room)
	}
	if got := room.URLPath(&Entry{Path: "deluxe"}); got != "/rooms/deluxe" {
		t.Errorf("URLPath = %q", got)
	}
}

func TestPermalinks(t *testing.T) {
	if got := PageType.URLPath(&Entry{Slug: "home", Path: "home"}); got != "/" {
		t.Errorf("home page URL = %q", got)
	}
	if got := PageType.URLPath(&Entry{Slug: "team", Path: "about/team"}); got != "/about/team" {
		t.Errorf("child page URL = %q", got)
	}
	if got := PostType.URLPath(&Entry{Slug: "news", Path: "news"}); got != "/guides/news" {
		t.Errorf("post URL = %q", got)
	}
}

func typeNames(types []ContentType) string {
	var names []string
	for _, ct := range types {
		names = append(names, ct.Name)
	}
	return strings.Join(names, ",")
}

func TestExampleContentTypesFile(t *testing.T) {
	r := NewRegistry()
	if err := r.LoadFile("../../examples/content-types.json"); err != nil {
		t.Fatal(err)
	}
	ct, ok := r.Get("activity")
	if !ok {
		t.Fatal("activity type not registered")
	}
	if f, _ := ct.Field("schedule"); !ct.Sortable || len(f.Columns) != 2 {
		t.Errorf("activity type = %+v", ct)
	}
}

func TestGalleryAndTableFields(t *testing.T) {
	a, b := "0b8f6c2e-8a3c-4d2e-9b5f-111111111111", "0b8f6c2e-8a3c-4d2e-9b5f-222222222222"
	out, errs := RoomType.ValidateFields(map[string]any{
		"price_npr": 2500.0, "max_guests": 2.0, "photos": []any{a, b},
	}, "")
	if len(errs) != 0 || len(out["photos"].([]string)) != 2 {
		t.Fatalf("out = %v, errs = %v", out, errs)
	}
	if ids := RoomType.FieldsFor("")[5].MediaIDs(out["photos"]); len(ids) != 2 {
		t.Errorf("MediaIDs(gallery) = %v", ids)
	}
	if _, errs = RoomType.ValidateFields(map[string]any{"price_npr": 1.0, "max_guests": 1.0, "photos": []any{"nope"}}, ""); errs["fields.photos"] == "" {
		t.Error("bad media ID accepted in gallery")
	}

	out, errs = PageType.ValidateFields(map[string]any{"photos": []any{
		map[string]any{"photo": a, "category": "food"},
		map[string]any{"photo": "", "category": ""}, // empty rows are dropped
		map[string]any{"photo": b, "category": "rooms"},
	}}, "gallery")
	rows, _ := out["photos"].([]map[string]any)
	if len(errs) != 0 || len(rows) != 2 || rows[1]["category"] != "rooms" {
		t.Fatalf("rows = %v, errs = %v", rows, errs)
	}
	photos, _ := PageType.Field("photos")
	if ids := photos.MediaIDs(out["photos"]); len(ids) != 2 {
		t.Errorf("MediaIDs(table) = %v", ids)
	}
	for _, bad := range []any{
		[]any{map[string]any{"photo": a, "category": "pets"}},
		[]any{map[string]any{"photo": a, "colour": "red"}},
		[]any{"not a row"},
		"not a list",
	} {
		if _, errs := PageType.ValidateFields(map[string]any{"photos": bad}, "gallery"); errs["fields.photos"] == "" {
			t.Errorf("accepted %v", bad)
		}
	}
	if _, errs := PageType.ValidateFields(map[string]any{"photos": []any{}}, "home"); errs["fields.photos"] != "unknown field" {
		t.Errorf("gallery field accepted on another template: %v", errs)
	}

	out, errs = SettingsType.ValidateFields(map[string]any{
		"phone":     "+977 984-4228627",
		"faqs":      []any{map[string]any{"question": "Wi-Fi?", "answer": "Yes, free."}},
		"amenities": []any{map[string]any{"icon": "wifi", "label": "Free Wi-Fi"}},
	}, "")
	if len(errs) != 0 || len(out["faqs"].([]map[string]any)) != 1 {
		t.Errorf("settings: out = %v, errs = %v", out, errs)
	}
}

func TestBuiltInTypesAreValid(t *testing.T) {
	r := NewRegistry()
	for _, ct := range []ContentType{PageType, PostType, RoomType, SettingsType} {
		if err := r.Register(ct); err != nil {
			t.Errorf("%s: %v", ct.Name, err)
		}
	}
	bad := ContentType{Name: "x", Label: "X", Templates: []string{"a"},
		TemplateFields: map[string][]Field{"b": {{Name: "f", Label: "F", Type: FieldText}}}}
	if err := r.Register(bad); err == nil {
		t.Error("template fields for an unknown template accepted")
	}
	bad = ContentType{Name: "y", Label: "Y", Fields: []Field{{Name: "t", Label: "T", Type: FieldTable}}}
	if err := r.Register(bad); err == nil {
		t.Error("table without columns accepted")
	}
}
