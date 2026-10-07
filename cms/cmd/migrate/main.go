// Command migrate applies the SQL migrations in /migrations to DATABASE_URL.
//
//	DATABASE_URL=postgres://... go run ./cmd/migrate
package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/database"
	"github.com/Ajit0o7/hotel-manakamana/cms/migrations"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Error("DATABASE_URL is required")
		os.Exit(2)
	}
	ctx := context.Background()
	pool, err := database.Connect(ctx, dsn, log)
	if err != nil {
		log.Error("connect", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool, migrations.FS, log); err != nil {
		log.Error("migrate", "err", err)
		os.Exit(1)
	}
	log.Info("database is up to date")
}
