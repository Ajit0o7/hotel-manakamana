// Package postgres implements media.Repository on Supabase Postgres.
package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/media"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/database"
)

// Repository stores media metadata in cms.media.
type Repository struct {
	pool *pgxpool.Pool
}

// New returns a Repository using pool.
func New(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

var _ media.Repository = (*Repository)(nil)

const selectMedia = `
select id, bucket, object_path, filename, mime_type, kind, size_bytes, width, height,
       title, alt_text, caption, description, variants, blur_data_url, uploaded_by, created_at, updated_at
from cms.media`

func scanMedia(row pgx.Row) (*media.Media, error) {
	var m media.Media
	err := row.Scan(&m.ID, &m.Bucket, &m.Path, &m.Filename, &m.MimeType, &m.Kind, &m.Size,
		&m.Width, &m.Height, &m.Title, &m.AltText, &m.Caption, &m.Description, &m.Variants,
		&m.BlurDataURL, &m.UploadedBy, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if m.Variants == nil {
		m.Variants = map[string]media.Variant{}
	}
	return &m, nil
}

// Create inserts a media record. The ID is chosen by the service, because it
// is part of the storage path.
func (r *Repository) Create(ctx context.Context, m *media.Media) error {
	variants := m.Variants
	if variants == nil {
		variants = map[string]media.Variant{}
	}
	err := r.pool.QueryRow(ctx, `
		insert into cms.media (id, bucket, object_path, filename, mime_type, kind, size_bytes, width, height,
		                       title, alt_text, caption, description, variants, blur_data_url, uploaded_by)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		returning created_at, updated_at`,
		m.ID, m.Bucket, m.Path, m.Filename, m.MimeType, m.Kind, m.Size, m.Width, m.Height,
		m.Title, m.AltText, m.Caption, m.Description, variants, m.BlurDataURL, m.UploadedBy,
	).Scan(&m.CreatedAt, &m.UpdatedAt)
	if pgErr, ok := database.PgError(err); ok && pgErr.Code == database.CodeUniqueViolation {
		return apperr.Conflict("a file already exists at this path")
	}
	return err
}

// Get loads one media record.
func (r *Repository) Get(ctx context.Context, id uuid.UUID) (*media.Media, error) {
	m, err := scanMedia(r.pool.QueryRow(ctx, selectMedia+` where id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, apperr.NotFound("media item not found")
	}
	return m, err
}

// GetMany loads the records that exist among ids.
func (r *Repository) GetMany(ctx context.Context, ids []uuid.UUID) ([]*media.Media, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx, selectMedia+` where id = any($1)`, ids)
	if err != nil {
		return nil, err
	}
	return collect(rows)
}

// List returns one page of the library, newest first, and the total count.
func (r *Repository) List(ctx context.Context, f media.ListFilter) ([]*media.Media, int, error) {
	var w database.Where
	if f.Kind != "" {
		w.Add("kind = ?", f.Kind)
	}
	if f.Search != "" {
		p := database.LikePattern(f.Search)
		w.Add("(filename ilike ? or title ilike ? or alt_text ilike ?)", p, p, p)
	}
	var total int
	if err := r.pool.QueryRow(ctx, "select count(*) from cms.media "+w.SQL(), w.Args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count media: %w", err)
	}
	limit, offset := w.Arg(f.Limit), w.Arg(f.Offset)
	rows, err := r.pool.Query(ctx, strings.Join([]string{selectMedia, w.SQL(),
		"order by created_at desc, id limit", limit, "offset", offset}, " "), w.Args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list media: %w", err)
	}
	items, err := collect(rows)
	return items, total, err
}

// Update saves the editable metadata.
func (r *Repository) Update(ctx context.Context, m *media.Media) error {
	err := r.pool.QueryRow(ctx, `
		update cms.media set title = $2, alt_text = $3, caption = $4, description = $5
		where id = $1 returning updated_at`,
		m.ID, m.Title, m.AltText, m.Caption, m.Description,
	).Scan(&m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return apperr.NotFound("media item not found")
	}
	return err
}

// Delete removes a media record.
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `delete from cms.media where id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NotFound("media item not found")
	}
	return nil
}

func collect(rows pgx.Rows) ([]*media.Media, error) {
	defer rows.Close()
	items := []*media.Media{}
	for rows.Next() {
		m, err := scanMedia(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}
