package content

// Built-in content types. Register more in app.RegisterContentTypes or via
// CONTENT_TYPES_FILE; see the README for a worked example.

// GalleryCategories are the filters on the website's gallery page.
var GalleryCategories = []string{"rooms", "food", "rooftop", "views", "hotel"}

// PageType is for the site's core, hierarchical pages (Home, About Us,
// Rooms, Contact...). Each page of the website has an entry whose template
// names the page; the entry holds the page's SEO settings and, for some
// templates, extra content (e.g. the gallery's photos).
var PageType = ContentType{
	Name:         "page",
	Label:        "Page",
	LabelPlural:  "Pages",
	Description:  "The website's pages (Home, Rooms, Dining, Gallery, Location, Guides, Contact). Their SEO settings and texts live here.",
	Hierarchical: true,
	Templates:    []string{"default", "home", "rooms", "dining", "gallery", "location", "guides", "contact", "about", "landing"},
	Fields: []Field{
		{Name: "subtitle", Label: "Subtitle", Type: FieldText, Help: "Shown under the page heading."},
		{Name: "hero_image", Label: "Hero image", Type: FieldMedia},
		{Name: "show_in_menu", Label: "Show in main menu", Type: FieldBoolean},
	},
	TemplateFields: map[string][]Field{
		"gallery": {
			{Name: "photos", Label: "Gallery photos", Type: FieldTable, Help: "Shown in this order; visitors can filter by category. The caption is also the alt text; leave it empty to use the photo's alt text.",
				Columns: []Column{
					{Name: "photo", Label: "Photo", Type: FieldMedia},
					{Name: "category", Label: "Category", Type: FieldSelect, Options: GalleryCategories},
					{Name: "caption", Label: "Caption", Type: FieldText},
				}},
		},
	},
	Permalink: func(e *Entry) string {
		if e.ParentID == nil && e.Slug == "home" {
			return "/"
		}
		return "/" + e.Path
	},
}

// PostType is for dated articles: travel guides, news and special offers.
// The website lists them under /guides.
var PostType = ContentType{
	Name:        "post",
	Label:       "Post",
	LabelPlural: "Posts",
	Description: "Travel guides, news and special offers, shown on the website under /guides.",
	RoutePrefix: "/guides",
	Templates:   []string{"guide", "news", "offer"},
	Fields: []Field{
		{Name: "eyebrow", Label: "Eyebrow", Type: FieldText, Help: "Small label above the heading, e.g. \"Flight guide\"."},
		{Name: "heading", Label: "Heading", Type: FieldText, Help: "The big heading on the page. Leave empty to use the title."},
		{Name: "heading_accent", Label: "Heading accent", Type: FieldText, Help: "Words shown in gold italics after the heading, e.g. \"flights\"."},
		{Name: "tags", Label: "Tags", Type: FieldList},
	},
	TemplateFields: map[string][]Field{
		"guide": {
			{Name: "updated_on", Label: "Last checked", Type: FieldDate, Help: "Shown as \"Updated …\". Leave empty to use the last save date."},
			{Name: "read_minutes", Label: "Reading time (minutes)", Type: FieldNumber, Help: "Leave empty to estimate it from the text."},
			{Name: "facts", Label: "Key facts", Type: FieldTable, Help: "The facts box at the top of the guide.",
				Columns: []Column{{Name: "term", Label: "Fact"}, {Name: "value", Label: "Value"}}},
			{Name: "sources", Label: "Sources", Type: FieldTable, Help: "Listed under \"Sources & further reading\".",
				Columns: []Column{{Name: "label", Label: "Title"}, {Name: "url", Label: "Link", Type: FieldURL}}},
			{Name: "hero_credit_author", Label: "Header photo credit: author", Type: FieldText, Help: "Only for photos you don't own."},
			{Name: "hero_credit_url", Label: "Header photo credit: source link", Type: FieldURL},
			{Name: "hero_credit_license", Label: "Header photo credit: licence", Type: FieldText, Help: "e.g. CC BY-SA 4.0"},
			{Name: "hero_credit_license_url", Label: "Header photo credit: licence link", Type: FieldURL},
		},
		"offer": {
			{Name: "offer_valid_from", Label: "Offer valid from", Type: FieldDate},
			{Name: "offer_valid_until", Label: "Offer valid until", Type: FieldDate},
			{Name: "offer_price_npr", Label: "Offer price (NPR)", Type: FieldNumber},
		},
	},
}

// RoomType is for the hotel's room types, shown on /rooms and /rooms/<slug>.
var RoomType = ContentType{
	Name:        "room",
	Label:       "Room",
	LabelPlural: "Rooms",
	Description: "Room types with prices and photos, shown on /rooms. Use the order number to sort them.",
	RoutePrefix: "/rooms",
	Sortable:    true,
	Fields: []Field{
		{Name: "price_npr", Label: "Price per night (NPR)", Type: FieldNumber, Required: true},
		{Name: "max_guests", Label: "Maximum guests", Type: FieldInteger, Required: true},
		{Name: "beds", Label: "Beds", Type: FieldText, Help: "e.g. \"1 double bed\""},
		{Name: "tag", Label: "Label", Type: FieldText, Help: "Short badge such as \"Deluxe\" or \"Best value\"."},
		{Name: "features", Label: "Features", Type: FieldList, Help: "One per line, e.g. \"Air conditioning\"."},
		{Name: "photos", Label: "Photos", Type: FieldGallery, Help: "The room's photo gallery, in order."},
	},
}

// AmenityIcons are the icons the website can show next to an amenity.
var AmenityIcons = []string{"wifi", "ac", "tv", "shower", "balcony", "bell", "food", "sun", "car", "bag", "nosmoke", "smoke", "plane", "bed", "users", "heart"}

// SettingsType holds the hotel's facts (one entry, slug "hotel"): contact
// details, ratings, policies, amenities, nearby places and FAQs.
var SettingsType = ContentType{
	Name:        "settings",
	Label:       "Hotel settings",
	LabelPlural: "Hotel settings",
	Description: "Phone numbers, address, ratings, policies, amenities, nearby places and FAQs used across the website.",
	Fields: []Field{
		{Name: "phone", Label: "Phone number", Type: FieldText, Required: true, Help: "As shown on the site, e.g. +977 984-4228627."},
		{Name: "whatsapp", Label: "WhatsApp number", Type: FieldText, Help: "Digits only with country code, e.g. 9779844228627."},
		{Name: "email", Label: "Email", Type: FieldEmail},
		{Name: "address", Label: "Full address", Type: FieldTextarea},
		{Name: "street", Label: "Street", Type: FieldText},
		{Name: "locality", Label: "Town", Type: FieldText},
		{Name: "region", Label: "Province", Type: FieldText},
		{Name: "postal_code", Label: "Postal code", Type: FieldText},
		{Name: "maps_url", Label: "Google Maps link", Type: FieldURL},
		{Name: "room_count", Label: "Number of rooms", Type: FieldInteger},
		{Name: "rating_value", Label: "Google rating", Type: FieldNumber, Help: "e.g. 4.1"},
		{Name: "rating_count", Label: "Number of Google reviews", Type: FieldInteger},
		{Name: "review_quote", Label: "Featured review", Type: FieldTextarea},
		{Name: "review_author", Label: "Featured review: author", Type: FieldText},
		{Name: "review_source", Label: "Featured review: source", Type: FieldText, Help: "e.g. Tripadvisor (5/5)"},
		{Name: "distance_airport", Label: "Distance to the airport", Type: FieldText},
		{Name: "distance_bus_park", Label: "Distance to the bus park", Type: FieldText},
		{Name: "distance_kathmandu", Label: "Travel time from Kathmandu", Type: FieldText},
		{Name: "languages", Label: "Languages spoken", Type: FieldList},
		{Name: "payment", Label: "Payment methods", Type: FieldList},
		{Name: "google_url", Label: "Google profile", Type: FieldURL},
		{Name: "facebook_url", Label: "Facebook page", Type: FieldURL},
		{Name: "tripadvisor_url", Label: "Tripadvisor page", Type: FieldURL},
		{Name: "ebooking_url", Label: "eBooking Nepal page", Type: FieldURL},
		{Name: "policies", Label: "Policies & house rules", Type: FieldTable,
			Columns: []Column{{Name: "term", Label: "Topic"}, {Name: "detail", Label: "Details", Type: FieldTextarea}}},
		{Name: "amenities", Label: "Amenities", Type: FieldTable,
			Columns: []Column{{Name: "icon", Label: "Icon", Type: FieldSelect, Options: AmenityIcons}, {Name: "label", Label: "Amenity"}}},
		{Name: "nearby", Label: "Nearby places", Type: FieldTable,
			Columns: []Column{{Name: "name", Label: "Place"}, {Name: "note", Label: "Note"}, {Name: "time", Label: "Distance or time"}}},
		{Name: "faqs", Label: "FAQs", Type: FieldTable, Help: "Shown on the contact page.",
			Columns: []Column{{Name: "question", Label: "Question"}, {Name: "answer", Label: "Answer", Type: FieldTextarea}}},
	},
}
