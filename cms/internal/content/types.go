package content

// Built-in content types. Register more in app.registerContentTypes or via
// CONTENT_TYPES_FILE; see the README for a worked example.

// PageType is for the site's core, hierarchical pages (Home, About Us,
// Rooms, Contact...).
var PageType = ContentType{
	Name:         "page",
	Label:        "Page",
	LabelPlural:  "Pages",
	Description:  "Static pages such as Home, About Us, Rooms and Contact. Pages can be nested.",
	Hierarchical: true,
	Templates:    []string{"default", "home", "about", "rooms", "room", "contact", "gallery", "landing"},
	Fields: []Field{
		{Name: "subtitle", Label: "Subtitle", Type: FieldText, Help: "Shown under the page heading."},
		{Name: "hero_image", Label: "Hero image", Type: FieldMedia},
		{Name: "show_in_menu", Label: "Show in main menu", Type: FieldBoolean},
	},
	Permalink: func(e *Entry) string {
		if e.ParentID == nil && e.Slug == "home" {
			return "/"
		}
		return "/" + e.Path
	},
}

// PostType is for dated content: blog articles, news and special offers.
var PostType = ContentType{
	Name:        "post",
	Label:       "Post",
	LabelPlural: "Posts",
	Description: "Blog articles, hotel news and special offers.",
	RoutePrefix: "/blog",
	Fields: []Field{
		{Name: "category", Label: "Category", Type: FieldSelect, Options: []string{"blog", "news", "offer"}},
		{Name: "tags", Label: "Tags", Type: FieldList},
		{Name: "offer_valid_from", Label: "Offer valid from", Type: FieldDate, Help: "Special offers only."},
		{Name: "offer_valid_until", Label: "Offer valid until", Type: FieldDate, Help: "Special offers only."},
		{Name: "offer_price_npr", Label: "Offer price (NPR)", Type: FieldNumber, Help: "Special offers only."},
	},
}
