package httpapi

import (
	"errors"
	"io"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/auth"
)

// Authenticator verifies bearer tokens. *auth.Verifier implements it.
type Authenticator interface {
	Verify(token string) (*auth.Principal, error)
}

const principalKey = "cms.principal"

// requireAdmin rejects requests without a valid admin access token.
func requireAdmin(a Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || strings.TrimSpace(token) == "" {
			c.Header("WWW-Authenticate", `Bearer realm="cms"`)
			fail(c, http.StatusUnauthorized, "unauthorized", "sign in to use the admin API")
			return
		}
		p, err := a.Verify(strings.TrimSpace(token))
		switch {
		case errors.Is(err, auth.ErrForbidden):
			fail(c, http.StatusForbidden, "forbidden", err.Error())
			return
		case err != nil:
			c.Header("WWW-Authenticate", `Bearer realm="cms", error="invalid_token"`)
			fail(c, http.StatusUnauthorized, "unauthorized", auth.ErrInvalidToken.Error())
			return
		}
		c.Set(principalKey, p)
		c.Header("Cache-Control", "no-store")
		c.Next()
	}
}

// principal returns the signed-in admin; only valid behind requireAdmin.
func principal(c *gin.Context) *auth.Principal {
	p, _ := c.Get(principalKey)
	pr, _ := p.(*auth.Principal)
	return pr
}

// cors allows the listed browser origins ("*" allows any) to call the API.
func cors(origins []string) gin.HandlerFunc {
	allowAll := slices.Contains(origins, "*")
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}
		c.Header("Vary", "Origin")
		if !allowAll && !slices.Contains(origins, origin) {
			if c.Request.Method == http.MethodOptions {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.Next()
			return
		}
		c.Header("Access-Control-Allow-Origin", origin)
		if c.Request.Method == http.MethodOptions {
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
			c.Header("Access-Control-Max-Age", "600")
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// requestLog logs one line per request.
func requestLog(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		attrs := []any{
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
		}
		if p := principal(c); p != nil {
			attrs = append(attrs, "user", p.UserID)
		}
		level := slog.LevelInfo
		if c.Writer.Status() >= 500 {
			level = slog.LevelError
		}
		log.Log(c.Request.Context(), level, "http request", attrs...)
	}
}

// recovery turns panics into 500 responses.
func recovery(log *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecoveryWithWriter(io.Discard, func(c *gin.Context, err any) {
		log.Error("panic", "err", err, "path", c.Request.URL.Path)
		fail(c, http.StatusInternalServerError, "internal", "something went wrong")
	})
}

// publicCache lets browsers and CDNs cache public reads briefly.
func publicCache(c *gin.Context) {
	c.Header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
	c.Next()
}
