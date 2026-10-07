// Package httpapi exposes the CMS over HTTP with Gin.
package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

// Deps are what the router needs.
type Deps struct {
	Content        *content.Service
	Media          *media.Service
	Analyzer       *seo.Analyzer
	Auth           Authenticator
	CORSOrigins    []string
	MaxUploadBytes int64
	// Ready reports whether dependencies (the database) are reachable.
	Ready  func(ctx context.Context) error
	Logger *slog.Logger
}

// NewRouter builds the HTTP handler.
//
// Public, read-only (published content only):
//
//	GET    /api/v1/content-types
//	GET    /api/v1/content/:type
//	GET    /api/v1/content/:type/by-path/*path
//
// Admin (Supabase access token with app_metadata.cms_role in CMS_ALLOWED_ROLES):
//
//	GET    /api/v1/admin/me
//	GET    /api/v1/admin/content-types
//	GET    /api/v1/admin/content/:type
//	POST   /api/v1/admin/content/:type
//	GET    /api/v1/admin/content/:type/:id
//	PUT    /api/v1/admin/content/:type/:id
//	DELETE /api/v1/admin/content/:type/:id
//	POST   /api/v1/admin/content/:type/:id/publish
//	POST   /api/v1/admin/content/:type/:id/unpublish
//	GET    /api/v1/admin/content/:type/:id/seo-analysis
//	POST   /api/v1/admin/seo/analyze
//	GET    /api/v1/admin/media
//	POST   /api/v1/admin/media
//	GET    /api/v1/admin/media/:id
//	PATCH  /api/v1/admin/media/:id
//	DELETE /api/v1/admin/media/:id
func NewRouter(d Deps) http.Handler {
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	r := gin.New()
	r.HandleMethodNotAllowed = true
	r.Use(recovery(d.Logger), requestLog(d.Logger), cors(d.CORSOrigins))
	r.NoRoute(func(c *gin.Context) { fail(c, http.StatusNotFound, "not_found", "no such endpoint") })
	r.NoMethod(func(c *gin.Context) { fail(c, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed") })

	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c, 3*time.Second)
		defer cancel()
		if d.Ready != nil {
			if err := d.Ready(ctx); err != nil {
				d.Logger.Warn("readiness check failed", "err", err)
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	ch := &contentHandler{svc: d.Content, analyzer: d.Analyzer}
	mh := &mediaHandler{svc: d.Media, maxBytes: d.MaxUploadBytes}
	listTypes := func(c *gin.Context) { respond(c, http.StatusOK, d.Content.Types.All()) }

	v1 := r.Group("/api/v1")
	public := v1.Group("", publicCache)
	public.GET("/content-types", listTypes)
	public.GET("/content/:type", ch.listLive)
	public.GET("/content/:type/by-path/*path", ch.getLiveByPath)

	admin := v1.Group("/admin", requireAdmin(d.Auth))
	admin.GET("/me", func(c *gin.Context) { respond(c, http.StatusOK, principal(c)) })
	admin.GET("/content-types", listTypes)

	admin.GET("/content/:type", ch.list)
	admin.POST("/content/:type", ch.create)
	admin.GET("/content/:type/:id", ch.get)
	admin.PUT("/content/:type/:id", ch.update)
	admin.DELETE("/content/:type/:id", ch.remove)
	admin.POST("/content/:type/:id/publish", ch.publish)
	admin.POST("/content/:type/:id/unpublish", ch.unpublish)
	admin.GET("/content/:type/:id/seo-analysis", ch.analyzeEntry)
	admin.POST("/seo/analyze", ch.analyzeDraft)

	admin.GET("/media", mh.list)
	admin.POST("/media", mh.upload)
	admin.GET("/media/:id", mh.get)
	admin.PATCH("/media/:id", mh.update)
	admin.DELETE("/media/:id", mh.remove)

	return r
}
