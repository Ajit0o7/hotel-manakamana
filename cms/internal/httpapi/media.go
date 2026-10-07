package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
)

// multipartOverhead is allowed on top of the file size for form fields and
// multipart boundaries.
const multipartOverhead = 1 << 20

type mediaHandler struct {
	svc      *media.Service
	maxBytes int64
}

// list: GET /api/v1/admin/media?kind=image&search=pool&page=1&per_page=20
func (h *mediaHandler) list(c *gin.Context) {
	p, err := parsePage(c, media.MaxPageSize)
	if err != nil {
		respondError(c, err)
		return
	}
	items, total, err := h.svc.List(c.Request.Context(), media.ListFilter{
		Kind:   media.Kind(c.Query("kind")),
		Search: strings.TrimSpace(c.Query("search")),
		Limit:  p.PerPage,
		Offset: p.offset(),
	})
	if err != nil {
		respondError(c, err)
		return
	}
	respondList(c, items, p, total)
}

// upload: POST /api/v1/admin/media (multipart/form-data)
// Fields: file (required), title, alt_text, caption, description.
func (h *mediaHandler) upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.maxBytes+multipartOverhead)
	fh, err := c.FormFile("file")
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			respondError(c, apperr.TooLarge("the file is larger than the %d MB limit", h.maxBytes>>20))
			return
		}
		fail(c, http.StatusBadRequest, "bad_request", `send the file as multipart/form-data in a field named "file"`)
		return
	}
	f, err := fh.Open()
	if err != nil {
		respondError(c, err)
		return
	}
	defer f.Close()

	opt := func(name string) *string {
		if v, ok := c.GetPostForm(name); ok {
			return &v
		}
		return nil
	}
	uploader := principal(c).UserID
	m, err := h.svc.Upload(c.Request.Context(), media.UploadInput{
		File:     f,
		Size:     fh.Size,
		Filename: fh.Filename,
		Metadata: media.Metadata{
			Title:       opt("title"),
			AltText:     opt("alt_text"),
			Caption:     opt("caption"),
			Description: opt("description"),
		},
		UploadedBy: &uploader,
	})
	if err != nil {
		respondError(c, err)
		return
	}
	c.Header("Location", "/api/v1/admin/media/"+m.ID.String())
	respond(c, http.StatusCreated, m)
}

// get: GET /api/v1/admin/media/:id
func (h *mediaHandler) get(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	m, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, m)
}

// update: PATCH /api/v1/admin/media/:id
// Body: any of {"title", "alt_text", "caption", "description"}.
func (h *mediaHandler) update(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	var md media.Metadata
	if !decodeJSON(c, &md) {
		return
	}
	m, err := h.svc.UpdateMetadata(c.Request.Context(), id, md)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, m)
}

// remove: DELETE /api/v1/admin/media/:id
func (h *mediaHandler) remove(c *gin.Context) {
	id, ok := pathUUID(c, "id")
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		respondError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
