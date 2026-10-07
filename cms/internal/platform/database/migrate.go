package database

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// migrationLockID is an arbitrary key for pg_advisory_xact_lock, so two
// deploys starting at once do not apply the same migration twice.
const migrationLockID = 727_420_115

// Migrate applies every *.sql file in fsys that has not been applied yet, in
// name order, each in its own transaction. Applied versions are recorded in
// cms.schema_migrations.
func Migrate(ctx context.Context, pool *pgxpool.Pool, fsys fs.FS, log *slog.Logger) error {
	names, err := fs.Glob(fsys, "*.sql")
	if err != nil {
		return err
	}
	sort.Strings(names)

	if _, err := pool.Exec(ctx, `
		create schema if not exists cms;
		create table if not exists cms.schema_migrations (
			version    text primary key,
			applied_at timestamptz not null default now()
		);`, pgx.QueryExecModeSimpleProtocol); err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	for _, name := range names {
		version := strings.TrimSuffix(name, ".sql")
		sql, err := fs.ReadFile(fsys, name)
		if err != nil {
			return err
		}
		applied, err := apply(ctx, pool, version, string(sql))
		if err != nil {
			return fmt.Errorf("migration %s: %w", name, err)
		}
		if applied {
			log.Info("migration applied", "version", version)
		}
	}
	return nil
}

func apply(ctx context.Context, pool *pgxpool.Pool, version, sql string) (bool, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	if _, err := tx.Exec(ctx, "select pg_advisory_xact_lock($1)", migrationLockID); err != nil {
		return false, err
	}
	var done bool
	if err := tx.QueryRow(ctx,
		"select exists (select 1 from cms.schema_migrations where version = $1)", version).Scan(&done); err != nil {
		return false, err
	}
	if done {
		return false, nil
	}
	// Multi-statement SQL needs the simple protocol.
	if _, err := tx.Exec(ctx, sql, pgx.QueryExecModeSimpleProtocol); err != nil {
		return false, err
	}
	if _, err := tx.Exec(ctx, "insert into cms.schema_migrations (version) values ($1)", version); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}
