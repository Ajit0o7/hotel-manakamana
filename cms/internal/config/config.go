// Package config loads runtime settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the complete runtime configuration of the CMS server.
type Config struct {
	Port string

	// DatabaseURL is the Supabase Postgres connection string. Use the direct
	// connection or the session pooler (port 5432). The transaction pooler
	// (port 6543) works too; the server switches to the simple query
	// protocol for it automatically.
	DatabaseURL string

	// SupabaseURL is the project URL, e.g. https://abcd.supabase.co.
	SupabaseURL string
	// SupabaseSecretKey is the service_role key (legacy JWT) or a new
	// sb_secret_... key. It is used only for server-side Storage calls.
	SupabaseSecretKey string
	// SupabaseJWTSecret enables verification of legacy HS256 access tokens.
	// Leave empty when the project uses asymmetric JWT signing keys only.
	SupabaseJWTSecret string
	StorageBucket     string

	// AllowedRoles lists the values of app_metadata.cms_role that may use
	// the admin API.
	AllowedRoles []string
	// JWTAudience is the expected "aud" claim of Supabase access tokens.
	JWTAudience string

	CORSAllowedOrigins []string
	MaxUploadBytes     int64

	// SiteURL is the public website origin, used to build default
	// canonical URLs and to tell internal links from outbound ones.
	SiteURL string

	// ContentTypesFile optionally points at a JSON file with extra content
	// type definitions, registered on top of the built-in ones.
	ContentTypesFile string

	ShutdownTimeout time.Duration
	LogLevel        string
}

// Load reads the configuration from the environment and validates it.
func Load() (Config, error) {
	cfg := Config{
		Port:               env("PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		SupabaseURL:        strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"),
		SupabaseSecretKey:  firstNonEmpty(os.Getenv("SUPABASE_SECRET_KEY"), os.Getenv("SUPABASE_SERVICE_ROLE_KEY")),
		SupabaseJWTSecret:  os.Getenv("SUPABASE_JWT_SECRET"),
		StorageBucket:      env("SUPABASE_STORAGE_BUCKET", "media"),
		AllowedRoles:       splitList(env("CMS_ALLOWED_ROLES", "admin")),
		JWTAudience:        env("SUPABASE_JWT_AUDIENCE", "authenticated"),
		CORSAllowedOrigins: splitList(os.Getenv("CORS_ALLOWED_ORIGINS")),
		SiteURL:            strings.TrimRight(env("SITE_URL", "https://www.hotelmanthali.com"), "/"),
		ContentTypesFile:   os.Getenv("CONTENT_TYPES_FILE"),
		LogLevel:           env("LOG_LEVEL", "info"),
	}

	var errs []error
	maxMB, err := strconv.Atoi(env("MAX_UPLOAD_MB", "50"))
	if err != nil || maxMB <= 0 {
		errs = append(errs, errors.New("MAX_UPLOAD_MB must be a positive integer"))
	}
	cfg.MaxUploadBytes = int64(maxMB) << 20

	cfg.ShutdownTimeout, err = time.ParseDuration(env("SHUTDOWN_TIMEOUT", "15s"))
	if err != nil {
		errs = append(errs, fmt.Errorf("SHUTDOWN_TIMEOUT: %w", err))
	}

	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if cfg.SupabaseURL == "" {
		errs = append(errs, errors.New("SUPABASE_URL is required"))
	} else if u, err := url.Parse(cfg.SupabaseURL); err != nil || u.Scheme == "" || u.Host == "" {
		errs = append(errs, errors.New("SUPABASE_URL must be an absolute URL"))
	}
	if cfg.SupabaseSecretKey == "" {
		errs = append(errs, errors.New("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is required"))
	}
	if len(cfg.AllowedRoles) == 0 {
		errs = append(errs, errors.New("CMS_ALLOWED_ROLES must list at least one role"))
	}
	if u, err := url.Parse(cfg.SiteURL); err != nil || u.Scheme == "" || u.Host == "" {
		errs = append(errs, errors.New("SITE_URL must be an absolute URL"))
	}
	return cfg, errors.Join(errs...)
}

// JWKSURL is where Supabase Auth publishes its public signing keys.
func (c Config) JWKSURL() string { return c.SupabaseURL + "/auth/v1/.well-known/jwks.json" }

// JWTIssuer is the "iss" claim Supabase Auth puts in access tokens.
func (c Config) JWTIssuer() string { return c.SupabaseURL + "/auth/v1" }

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return fallback
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func splitList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}
