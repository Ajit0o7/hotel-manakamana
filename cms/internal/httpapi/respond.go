package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
)

// maxJSONBody bounds JSON request bodies (entry content is capped at 2 MiB).
const maxJSONBody = 4 << 20

type errorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// listMeta describes a page of results.
type listMeta struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}

func respond(c *gin.Context, status int, data any) {
	c.JSON(status, gin.H{"data": data})
}

func respondList(c *gin.Context, data any, p page, total int) {
	c.JSON(http.StatusOK, gin.H{"data": data, "meta": listMeta{Page: p.Page, PerPage: p.PerPage, Total: total}})
}

func fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": errorBody{Code: code, Message: message}})
}

var statusByCode = map[apperr.Code]int{
	apperr.CodeNotFound:    http.StatusNotFound,
	apperr.CodeConflict:    http.StatusConflict,
	apperr.CodeInvalid:     http.StatusUnprocessableEntity,
	apperr.CodeTooLarge:    http.StatusRequestEntityTooLarge,
	apperr.CodeUnsupported: http.StatusUnsupportedMediaType,
}

// respondError maps domain errors to HTTP responses. Anything unclassified
// is logged and reported as a generic 500, so internals never leak.
func respondError(c *gin.Context, err error) {
	if e, ok := apperr.As(err); ok {
		status := statusByCode[e.Code]
		if status == 0 {
			status = http.StatusBadRequest
		}
		c.AbortWithStatusJSON(status, gin.H{"error": errorBody{Code: string(e.Code), Message: e.Message, Fields: e.Fields}})
		return
	}
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		fail(c, http.StatusRequestEntityTooLarge, string(apperr.CodeTooLarge), "the request body is too large")
		return
	}
	if errors.Is(err, c.Request.Context().Err()) && c.Request.Context().Err() != nil {
		c.Abort() // client went away
		return
	}
	slog.ErrorContext(c.Request.Context(), "request failed", "method", c.Request.Method,
		"path", c.FullPath(), "err", err)
	fail(c, http.StatusInternalServerError, "internal", "something went wrong")
}

// decodeJSON strictly decodes the request body into dst.
func decodeJSON(c *gin.Context, dst any) bool {
	body := http.MaxBytesReader(c.Writer, c.Request.Body, maxJSONBody)
	dec := json.NewDecoder(body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var tooBig *http.MaxBytesError
		switch {
		case errors.As(err, &tooBig):
			fail(c, http.StatusRequestEntityTooLarge, string(apperr.CodeTooLarge), "the request body is too large")
		case errors.Is(err, io.EOF):
			fail(c, http.StatusBadRequest, "bad_request", "the request body is empty")
		default:
			fail(c, http.StatusBadRequest, "bad_request", "invalid JSON: "+err.Error())
		}
		return false
	}
	if dec.More() {
		fail(c, http.StatusBadRequest, "bad_request", "invalid JSON: unexpected data after the object")
		return false
	}
	return true
}

func pathUUID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		fail(c, http.StatusNotFound, string(apperr.CodeNotFound), "not found")
		return uuid.Nil, false
	}
	return id, true
}

type page struct {
	Page    int
	PerPage int
}

func (p page) offset() int { return (p.Page - 1) * p.PerPage }

func parsePage(c *gin.Context, maxPerPage int) (page, error) {
	p := page{Page: 1, PerPage: 20}
	if v := c.Query("page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 100_000 {
			return p, apperr.Invalid("page must be a positive integer")
		}
		p.Page = n
	}
	if v := c.Query("per_page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > maxPerPage {
			return p, apperr.Invalid("per_page must be between 1 and %d", maxPerPage)
		}
		p.PerPage = n
	}
	return p, nil
}

func queryBool(c *gin.Context, name string) (bool, error) {
	v := c.Query(name)
	if v == "" {
		return false, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, apperr.Invalid("%s must be true or false", name)
	}
	return b, nil
}

func queryUUID(c *gin.Context, name string) (*uuid.UUID, error) {
	v := c.Query(name)
	if v == "" {
		return nil, nil
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return nil, apperr.Invalid("%s must be a UUID", name)
	}
	return &id, nil
}
