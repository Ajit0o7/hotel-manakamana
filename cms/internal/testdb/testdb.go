// Package testdb gives integration tests a freshly migrated, throwaway
// Postgres database.
//
// Tests using it are skipped unless CMS_TEST_DATABASE_URL points at a server
// where the user may create databases, e.g.
//
//	CMS_TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres go test ./...
//
// A new database with a random name is created for each test and dropped
// afterwards; the database named in the URL is never modified.
package testdb

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/database"
	"github.com/Ajit0o7/hotel-manakamana/cms/migrations"
)

// New returns a pool connected to a new, migrated database.
func New(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("CMS_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set CMS_TEST_DATABASE_URL to run database integration tests")
	}
	ctx := context.Background()

	admin, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect to %s: %v", dsn, err)
	}
	name := "cms_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")[:12]
	if _, err := admin.Exec(ctx, "create database "+name); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	t.Cleanup(func() {
		_, _ = admin.Exec(context.Background(), "drop database if exists "+name+" with (force)")
		admin.Close(context.Background())
	})

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.Database = name
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)

	log := slog.New(slog.DiscardHandler)
	if err := database.Migrate(ctx, pool, migrations.FS, log); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return pool
}

// Exec runs SQL on the pool, failing the test on error.
func Exec(t *testing.T, pool *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatal(fmt.Errorf("%s: %w", sql, err))
	}
}
