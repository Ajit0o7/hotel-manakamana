// Package app is the composition root: it builds every component and wires
// them together through their interfaces (dependency injection by hand).
package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/auth"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/config"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	contentpg "github.com/Ajit0o7/hotel-manakamana/cms/internal/content/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/httpapi"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/imaging"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
	mediapg "github.com/Ajit0o7/hotel-manakamana/cms/internal/media/postgres"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/database"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/supabase"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/sanitize"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seed"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
	"github.com/Ajit0o7/hotel-manakamana/cms/migrations"
)

// RegisterContentTypes registers the built-in content types. Add your own
// here (or in CONTENT_TYPES_FILE); see the README.
func RegisterContentTypes(r *content.Registry) {
	r.MustRegister(content.PageType)
	r.MustRegister(content.PostType)
	r.MustRegister(content.RoomType)
	r.MustRegister(content.SettingsType)
}

// Run starts the server and blocks until ctx is cancelled.
func Run(ctx context.Context, cfg config.Config, log *slog.Logger) error {
	pool, err := database.Connect(ctx, cfg.DatabaseURL, log)
	if err != nil {
		return err
	}
	defer pool.Close()

	if cfg.AutoMigrate {
		if err := database.Migrate(ctx, pool, migrations.FS, log); err != nil {
			return err
		}
	}

	built, err := Build(ctx, cfg, pool, log)
	if err != nil {
		return err
	}
	handler := built.Handler

	srv := &http.Server{
		Addr:              net.JoinHostPort("", cfg.Port),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       10 * time.Minute, // large uploads on slow links
		WriteTimeout:      10 * time.Minute,
		IdleTimeout:       2 * time.Minute,
		BaseContext:       func(net.Listener) context.Context { return ctx },
	}
	errc := make(chan error, 1)
	go func() {
		log.Info("cms listening", "addr", srv.Addr)
		errc <- srv.ListenAndServe()
	}()

	if cfg.Seed {
		go importSeed(ctx, pool, built, log)
	}

	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
	}
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// Built is the wired application.
type Built struct {
	Handler http.Handler
	Content *content.Service
	Media   *media.Service
}

// importSeed imports the website's original content once (see package seed).
func importSeed(ctx context.Context, pool *pgxpool.Pool, b *Built, log *slog.Logger) {
	bundle, images, err := seed.Load()
	if err != nil {
		log.Error("seed: cannot read bundle", "err", err)
		return
	}
	im := &seed.Importer{Pool: pool, Media: b.Media, Content: b.Content, Log: log}
	if err := im.Run(ctx, bundle, images); err != nil && ctx.Err() == nil {
		log.Error("seed: import incomplete; it will continue on the next start", "err", err)
	}
}

// Build wires all components into an HTTP handler.
func Build(ctx context.Context, cfg config.Config, pool *pgxpool.Pool, log *slog.Logger) (*Built, error) {
	gin.SetMode(gin.ReleaseMode)

	types := content.NewRegistry()
	RegisterContentTypes(types)
	if cfg.ContentTypesFile != "" {
		if err := types.LoadFile(cfg.ContentTypesFile); err != nil {
			return nil, fmt.Errorf("load content types: %w", err)
		}
	}

	verifier, err := auth.NewVerifier(ctx, auth.Config{
		JWKSURL:      cfg.JWKSURL(),
		HMACSecret:   []byte(cfg.SupabaseJWTSecret),
		Issuer:       cfg.JWTIssuer(),
		Audience:     cfg.JWTAudience,
		AllowedRoles: cfg.AllowedRoles,
	})
	if err != nil {
		return nil, err
	}

	mediaSvc := media.NewService(media.Deps{
		Repo:     mediapg.New(pool),
		Store:    supabase.NewStorage(cfg.SupabaseURL, cfg.SupabaseSecretKey, cfg.StorageBucket),
		Images:   imaging.NewProcessor(),
		MaxBytes: cfg.MaxUploadBytes,
		Logger:   log,
	})

	siteHost := ""
	if u, err := url.Parse(cfg.SiteURL); err == nil {
		siteHost = u.Host
	}
	analyzer := seo.NewAnalyzer(siteHost)

	contentSvc := content.NewService(content.Deps{
		Repo:      contentpg.New(pool),
		Types:     types,
		Media:     MediaResolver{Media: mediaSvc},
		Sanitizer: sanitize.New(),
		Analyzer:  analyzer,
		SiteURL:   cfg.SiteURL,
	})

	handler := httpapi.NewRouter(httpapi.Deps{
		Content:        contentSvc,
		Media:          mediaSvc,
		Analyzer:       analyzer,
		Auth:           verifier,
		CORSOrigins:    cfg.CORSAllowedOrigins,
		MaxUploadBytes: cfg.MaxUploadBytes,
		Ready:          pool.Ping,
		Logger:         log,
	})
	return &Built{Handler: handler, Content: contentSvc, Media: mediaSvc}, nil
}

// MediaResolver adapts the media service to content.MediaResolver, so the
// content package never imports the media package.
type MediaResolver struct {
	Media *media.Service
}

// ResolveMedia implements content.MediaResolver.
func (r MediaResolver) ResolveMedia(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]content.MediaRef, error) {
	items, err := r.Media.GetMany(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make(map[uuid.UUID]content.MediaRef, len(items))
	for _, m := range items {
		ref := content.MediaRef{
			ID: m.ID, URL: m.URL, MimeType: m.MimeType, AltText: m.AltText, Caption: m.Caption,
			Width: m.Width, Height: m.Height, BlurDataURL: m.BlurDataURL,
		}
		if len(m.Variants) > 0 {
			ref.Sizes = make(map[string]content.MediaSize, len(m.Variants))
			for name, v := range m.Variants {
				ref.Sizes[name] = content.MediaSize{URL: v.URL, Width: v.Width, Height: v.Height}
			}
		}
		out[m.ID] = ref
	}
	return out, nil
}
