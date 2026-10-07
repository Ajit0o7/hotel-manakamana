package httpapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

type contentHandler struct {
	svc      *content.Service
	analyzer *seo.Analyzer
}

// listFilter reads the query parameters shared by public and admin listings:
// page, per_page, parent (UUID), root, search, order and field.<name>.
func (h *contentHandler) listFilter(c *gin.Context) (content.ListFilter, page, error) {
	p, err := parsePage(c, content.MaxPageSize)
	if err != nil {
		return content.ListFilter{}, p, err
	}
	f := content.ListFilter{
		Type:   c.Param("type"),
		Search: strings.TrimSpace(c.Query("search")),
		Order:  content.Order(c.Query("order")),
		Limit:  p.PerPage,
		Offset: p.offset(),
	}
	if f.ParentID, err = queryUUID(c, "parent"); err != nil {
		return f, p, err
	}
	if f.RootOnly, err = queryBool(c, "root"); err != nil {
		return f, p, err
	}
	for key, vals := range c.Request.URL.Query() {
		if name, ok := strings.CutPrefix(key, "field."); ok && len(vals) > 0 {
			if f.Fields == nil {
				f.Fields = map[string]string{}
			}
			f.Fields[name] = vals[0]
		}
	}
	return f, p, nil
}

// ---- Public, read-only ----------------------------------------------------

// listLive: GET /api/v1/content/:type
func (h *contentHandler) listLive(c *gin.Context) {
	f, p, err := h.listFilter(c)
	if err != nil {
		respondError(c, err)
		return
	}
	entries, total, err := h.svc.ListLive(c.Request.Context(), f)
	if err != nil {
		respondError(c, err)
		return
	}
	out, err := h.svc.Present(c.Request.Context(), entries...)
	if err != nil {
		respondError(c, err)
		return
	}
	respondList(c, out, p, total)
}

// getLiveByPath: GET /api/v1/content/:type/by-path/*path
func (h *contentHandler) getLiveByPath(c *gin.Context) {
	e, err := h.svc.GetLiveByPath(c.Request.Context(), c.Param("type"), c.Param("path"))
	if err != nil {
		respondError(c, err)
		return
	}
	out, err := h.svc.Present(c.Request.Context(), e)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, out[0])
}

// ---- Admin ----------------------------------------------------------------

// list: GET /api/v1/admin/content/:type?status=draft,published
func (h *contentHandler) list(c *gin.Context) {
	f, p, err := h.listFilter(c)
	if err != nil {
		respondError(c, err)
		return
	}
	if s := c.Query("status"); s != "" {
		for _, st := range strings.Split(s, ",") {
			f.Statuses = append(f.Statuses, content.Status(strings.TrimSpace(st)))
		}
	}
	entries, total, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		respondError(c, err)
		return
	}
	respondList(c, entries, p, total)
}

// create: POST /api/v1/admin/content/:type
func (h *contentHandler) create(c *gin.Context) {
	var in content.Input
	if !decodeJSON(c, &in) {
		return
	}
	author := principal(c).UserID
	e, err := h.svc.Create(c.Request.Context(), c.Param("type"), in, &author)
	if err != nil {
		respondError(c, err)
		return
	}
	c.Header("Location", "/api/v1/admin/content/"+e.Type+"/"+e.ID.String())
	respond(c, http.StatusCreated, e)
}

// get: GET /api/v1/admin/content/:type/:id
func (h *contentHandler) get(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	e, err := h.svc.Get(c.Request.Context(), c.Param("type"), id)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, e)
}

// update: PUT /api/v1/admin/content/:type/:id
func (h *contentHandler) update(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	var in content.Input
	if !decodeJSON(c, &in) {
		return
	}
	e, err := h.svc.Update(c.Request.Context(), c.Param("type"), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, e)
}

// remove: DELETE /api/v1/admin/content/:type/:id
func (h *contentHandler) remove(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), c.Param("type"), id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// publish: POST /api/v1/admin/content/:type/:id/publish
// Optional body: {"published_at": "2026-12-01T00:00:00Z"} to schedule.
func (h *contentHandler) publish(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	var body struct {
		PublishedAt *time.Time `json:"published_at"`
	}
	if c.Request.ContentLength != 0 && !decodeJSON(c, &body) {
		return
	}
	e, err := h.svc.Publish(c.Request.Context(), c.Param("type"), id, body.PublishedAt)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, e)
}

// unpublish: POST /api/v1/admin/content/:type/:id/unpublish
func (h *contentHandler) unpublish(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	e, err := h.svc.Unpublish(c.Request.Context(), c.Param("type"), id)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, e)
}

// analyzeEntry: GET /api/v1/admin/content/:type/:id/seo-analysis
func (h *contentHandler) analyzeEntry(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	rep, err := h.svc.Analyze(c.Request.Context(), c.Param("type"), id)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, rep)
}

// analyzeDraft: POST /api/v1/admin/seo/analyze
// Scores unsaved content, for live feedback while editing.
func (h *contentHandler) analyzeDraft(c *gin.Context) {
	var in seo.Input
	if !decodeJSON(c, &in) {
		return
	}
	if errs := in.Meta.Validate(); len(errs) > 0 {
		respondError(c, apperr.Validation(errs))
		return
	}
	respond(c, http.StatusOK, h.analyzer.Analyze(in))
}
