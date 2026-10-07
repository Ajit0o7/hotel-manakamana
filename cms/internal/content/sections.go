package content

// The section layouts of a page's "Sections" field: the building blocks of
// every page on the website, ACF "flexible content" style. A page is a list
// of sections; each section is one of these layouts with its own content.

// Icons are the icon names the website can draw.
var Icons = []string{
	"plane", "star", "bus", "bed", "shower", "food", "tea", "sun", "heart", "pin", "cash", "health",
	"landmark", "phone", "wifi", "users", "ac", "tv", "balcony", "bell", "car", "bag", "nosmoke",
	"calendar", "clock", "wind", "check", "wa",
}

const (
	headingHelp = "Put *stars* around words to show them in gold italics. Press Enter for a line break."
	textHelp    = "Leave a blank line between paragraphs. **Bold**, [link text](/contact) and {placeholders} work here."
)

var (
	fEyebrow    = Field{Name: "eyebrow", Label: "Small label", Type: FieldText, Help: "The small gold label above the heading."}
	fNumber     = Field{Name: "number", Label: "Label number", Type: FieldText, Help: "Optional number before the small label, e.g. 01."}
	fHeading    = Field{Name: "heading", Label: "Heading", Type: FieldTextarea, Help: headingHelp}
	fText       = Field{Name: "text", Label: "Text", Type: FieldTextarea, Help: textHelp}
	fPhoto      = Field{Name: "photo", Label: "Photo", Type: FieldMedia}
	fBackground = Field{Name: "background", Label: "Background", Type: FieldSelect, Options: []string{"light", "sand", "pine"}}
	fAnchor     = Field{Name: "anchor", Label: "Anchor", Type: FieldText, Help: "Optional. Lets links jump here, e.g. \"map\" for /location#map."}
	fButtons    = Field{Name: "buttons", Label: "Buttons", Type: FieldTable, Help: "Links can be pages (/contact), anchors (/contact#enquiry), tel:{phone_tel} or {whatsapp_url}.",
		Columns: []Column{
			{Name: "label", Label: "Label"},
			{Name: "link", Label: "Link"},
			{Name: "style", Label: "Style", Type: FieldSelect, Options: []string{"gold", "dark", "light", "outline"}},
			{Name: "icon", Label: "Icon", Type: FieldSelect, Options: []string{"arrow", "phone", "pin", "wa"}},
		}}
	fCards = Field{Name: "items", Label: "Cards", Type: FieldTable, Columns: []Column{
		{Name: "icon", Label: "Icon", Type: FieldSelect, Options: Icons},
		{Name: "title", Label: "Title"},
		{Name: "text", Label: "Text", Type: FieldTextarea},
	}}
)

// heading returns the usual label + heading fields of a section.
func heading(extra ...Field) []Field {
	return append([]Field{fEyebrow, fNumber, fHeading}, extra...)
}

// PageSections is the layouts editors build pages from.
var PageSections = []Layout{
	{Name: "hero_slideshow", Label: "Hero slideshow", Help: "Full-screen photos that fade into each other, with the main heading. For the home page.",
		Fields: []Field{fEyebrow, fHeading, fText, fButtons,
			{Name: "show_rating", Label: "Show the Google rating", Type: FieldBoolean},
			{Name: "slides", Label: "Slides", Type: FieldTable, Columns: []Column{
				{Name: "photo", Label: "Photo", Type: FieldMedia},
				{Name: "caption", Label: "Caption"},
				{Name: "tall", Label: "Tall photo (show all of it)", Type: FieldBoolean},
			}},
		}},
	{Name: "page_hero", Label: "Page header", Help: "The photo header at the top of a page, with the page heading.",
		Fields: []Field{fPhoto, fEyebrow, fHeading, fText,
			{Name: "crumb", Label: "Breadcrumb label", Type: FieldText, Help: "Shown after \"Home /\". Leave empty to use the page title."}}},
	{Name: "booking_bar", Label: "Booking bar", Help: "Dates and guests, linking to the enquiry form.", Fields: []Field{}},
	{Name: "facts", Label: "Key numbers", Help: "Big numbers that count up, e.g. the rating or the distance to the airport.",
		Fields: []Field{{Name: "items", Label: "Numbers", Type: FieldTable, Columns: []Column{
			{Name: "value", Label: "Number"},
			{Name: "suffix", Label: "After the number"},
			{Name: "label", Label: "Label"},
		}}}},
	{Name: "marquee", Label: "Scrolling words", Fields: []Field{{Name: "words", Label: "Words", Type: FieldList}}},
	{Name: "split", Label: "Photo and text", Help: "A photo (or the map) beside a heading, text, lists and buttons.",
		Fields: append(heading(),
			fBackground,
			Field{Name: "media", Label: "Beside the text", Type: FieldSelect, Options: []string{"photo", "map"}},
			fPhoto,
			Field{Name: "photo_side", Label: "Photo side", Type: FieldSelect, Options: []string{"left", "right"}},
			Field{Name: "badge_value", Label: "Photo badge: big text", Type: FieldText, Help: "Optional, e.g. {rating}★."},
			Field{Name: "badge_text", Label: "Photo badge: text", Type: FieldText},
			Field{Name: "lead", Label: "Intro (larger text)", Type: FieldTextarea, Help: textHelp},
			fText,
			Field{Name: "details", Label: "Details", Type: FieldTable, Columns: []Column{{Name: "term", Label: "Term"}, {Name: "detail", Label: "Detail"}}},
			Field{Name: "show_policies", Label: "Show the hotel policies as details", Type: FieldBoolean},
			Field{Name: "checks", Label: "Check list", Type: FieldList},
			Field{Name: "show_weather", Label: "Show Manthali's weather", Type: FieldBoolean},
			Field{Name: "note", Label: "Small print", Type: FieldTextarea},
			fButtons, fAnchor,
		)},
	{Name: "features", Label: "Feature cards", Help: "Numbered cards with an icon, a title and a short text.",
		Fields: append(heading(), fBackground, fCards, fAnchor)},
	{Name: "stay_story", Label: "Step-by-step story", Help: "Photo cards that slide sideways as visitors scroll.",
		Fields: append(heading(), fText, Field{Name: "steps", Label: "Steps", Type: FieldTable, Columns: []Column{
			{Name: "step", Label: "Step label"}, {Name: "title", Label: "Title"},
			{Name: "text", Label: "Text", Type: FieldTextarea}, {Name: "photo", Label: "Photo", Type: FieldMedia},
		}})},
	{Name: "rooms_preview", Label: "Room cards", Help: "A card for each room, from Rooms.",
		Fields: append(heading(), fText, Field{Name: "link_label", Label: "Link to all rooms", Type: FieldText})},
	{Name: "rooms_list", Label: "Room details", Help: "Every room in full, from Rooms.",
		Fields: []Field{{Name: "note", Label: "Small print under the rooms", Type: FieldTextarea}}},
	{Name: "banner", Label: "Photo banner", Help: "A wide photo with a heading, text and buttons over it.",
		Fields: append(heading(), fPhoto, fText, fButtons, Field{Name: "show_weather", Label: "Show Manthali's weather", Type: FieldBoolean}, fAnchor)},
	{Name: "flight_board", Label: "Lukla flights board", Help: "The departures board with the airlines, travel tips and the latest guides.",
		Fields: []Field{
			{Name: "note", Label: "Note under the board", Type: FieldTextarea, Help: textHelp},
			{Name: "tips", Label: "Tips", Type: FieldTable, Columns: fCards.Columns},
			{Name: "guides_eyebrow", Label: "Guides: small label", Type: FieldText},
			{Name: "guides_heading", Label: "Guides: heading", Type: FieldTextarea, Help: headingHelp},
		}},
	{Name: "review", Label: "Guest review", Help: "The review and rating from Hotel settings.", Fields: []Field{}},
	{Name: "photo_mosaic", Label: "Photo mosaic", Help: "Four photos in a mosaic, with a link.",
		Fields: append(heading(), fBackground,
			Field{Name: "link_label", Label: "Link text", Type: FieldText}, Field{Name: "link", Label: "Link", Type: FieldText},
			Field{Name: "photos", Label: "Photos", Type: FieldGallery})},
	{Name: "amenities", Label: "Amenities", Help: "The amenities from Hotel settings.", Fields: append(heading(), fBackground)},
	{Name: "menu_cards", Label: "Menu cards", Help: "Photo cards for dishes.",
		Fields: append(heading(), fBackground, Field{Name: "items", Label: "Dishes", Type: FieldTable, Columns: []Column{
			{Name: "photo", Label: "Photo", Type: FieldMedia}, {Name: "tag", Label: "Tag"},
			{Name: "title", Label: "Title"}, {Name: "text", Label: "Text", Type: FieldTextarea},
		}})},
	{Name: "gallery", Label: "Photo gallery", Help: "Photos visitors can filter by category.",
		Fields: []Field{{Name: "photos", Label: "Photos", Type: FieldTable, Help: "The caption is also the alt text; leave it empty to use the photo's alt text.",
			Columns: []Column{
				{Name: "photo", Label: "Photo", Type: FieldMedia},
				{Name: "category", Label: "Category", Type: FieldSelect, Options: GalleryCategories},
				{Name: "caption", Label: "Caption"},
			}}}},
	{Name: "guides_grid", Label: "Guide cards", Help: "A card for every published post.", Fields: []Field{}},
	{Name: "enquiry", Label: "Booking enquiry", Help: "The enquiry form (sent by WhatsApp) beside the contact details.",
		Fields: []Field{
			{Name: "form_heading", Label: "Form heading", Type: FieldText},
			{Name: "form_text", Label: "Form intro", Type: FieldTextarea},
			{Name: "side_eyebrow", Label: "Contact box: small label", Type: FieldText},
			{Name: "side_heading", Label: "Contact box: heading", Type: FieldTextarea, Help: headingHelp},
			{Name: "rooms_text", Label: "Contact box: rooms line", Type: FieldText},
			fAnchor,
		}},
	{Name: "faq", Label: "FAQ", Help: "The questions and answers from Hotel settings.", Fields: append(heading(), fBackground)},
	{Name: "area_map", Label: "3D area map", Fields: append(heading(), fBackground, fText, fAnchor)},
	{Name: "routes", Label: "Travel times", Help: "Cards with a time or distance, a title and a text.",
		Fields: append(heading(), fBackground, Field{Name: "items", Label: "Routes", Type: FieldTable, Columns: []Column{
			{Name: "time", Label: "Time or distance"}, {Name: "title", Label: "Title"}, {Name: "text", Label: "Text", Type: FieldTextarea},
		}}, fAnchor)},
	{Name: "nearby", Label: "Nearby places", Help: "The nearby places from Hotel settings.",
		Fields: append(heading(), fBackground, Field{Name: "note", Label: "Small print", Type: FieldTextarea})},
	{Name: "text", Label: "Text", Help: "Free text with headings, lists, links and images.",
		Fields: append(heading(), fBackground, Field{Name: "content", Label: "Content", Type: FieldRichText}, fAnchor)},
	{Name: "cta_band", Label: "Call to action", Help: "The green band with call and WhatsApp buttons.",
		Fields: []Field{fEyebrow, fHeading, fText}},
}

// SectionsField is the page builder field of pages.
var SectionsField = Field{
	Name:    "sections",
	Label:   "Sections",
	Type:    FieldFlexible,
	Layouts: PageSections,
	Help: "The page, from top to bottom. In texts you can use {phone}, {whatsapp_url}, {email}, {address}, {price_from}, " +
		"{rating}, {reviews}, {room_count}, {distance_airport}, {distance_bus_park} and {distance_kathmandu}: " +
		"they show the current value from Hotel settings and Rooms.",
}
