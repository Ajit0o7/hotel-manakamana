// Package postgres implements content.Repository on Supabase Postgres.
package postgres

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Ajit0o7/hotel-manakamana/cms/internal/apperr"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/content"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/platform/database"
	"github.com/Ajit0o7/hotel-manakamana/cms/internal/seo"
)

// Repository stores entries in cms.entries and their SEO data in cms.seo_data.
type Repository struct {
	pool *pgxpool.Pool
}

// New returns a Repository using pool.
func New(pool *pgxpool.Pool) *Repository { return &Repository{pool: pool} }

var _ content.Repository = (*Repository)(nil)

const selectEntry = `
select e.id, e.type, e.title, e.slug, e.path, e.content, e.excerpt, e.status,
       e.parent_id, e.menu_order, e.template, e.featured_media_id, e.fields,
       e.author_id, e.published_at, e.created_at, e.updated_at,
       coalesce(s.meta_title, ''), coalesce(s.meta_description, ''),
       coalesce(s.focus_keyword, ''), coalesce(s.canonical_url, ''),
       coalesce(s.og_title, ''), coalesce(s.og_description, ''),
       s.og_image_id, coalesce(s.og_image_url, ''),
       coalesce(s.no_index, false), coalesce(s.no_follow, false),
       s.seo_score, s.readability_score
from cms.entries e
left join cms.seo_data s on s.entry_id = e.id`

func scanEntry(row pgx.Row) (*content.Entry, error) {
	var e content.Entry
	var m seo.Meta
	err := row.Scan(&e.ID, &e.Type, &e.Title, &e.Slug, &e.Path, &e.Content, &e.Excerpt, &e.Status,
		&e.ParentID, &e.MenuOrder, &e.Template, &e.FeaturedMediaID, &e.Fields,
		&e.AuthorID, &e.PublishedAt, &e.CreatedAt, &e.UpdatedAt,
		&m.MetaTitle, &m.MetaDescription, &m.FocusKeyword, &m.CanonicalURL,
		&m.OGTitle, &m.OGDescription, &m.OGImageID, &m.OGImageURL,
		&m.NoIndex, &m.NoFollow, &m.SEOScore, &m.ReadabilityScore)
	if err != nil {
		return nil, err
	}
	e.SEO = m
	return &e, nil
}

// Create inserts the entry and its SEO row in one transaction.
func (r *Repository) Create(ctx context.Context, e *content.Entry) error {
	return pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			insert into cms.entries (type, title, slug, content, excerpt, status, parent_id,
			                         menu_order, template, featured_media_id, fields, author_id, published_at)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			returning id, path, created_at, updated_at`,
			e.Type, e.Title, e.Slug, e.Content, e.Excerpt, e.Status, e.ParentID,
			e.MenuOrder, e.Template, e.FeaturedMediaID, fieldsOrEmpty(e.Fields), e.AuthorID, e.PublishedAt,
		).Scan(&e.ID, &e.Path, &e.CreatedAt, &e.UpdatedAt)
		if err != nil {
			return mapWriteError(err)
		}
		return saveSEO(ctx, tx, e.ID, e.SEO)
	})
}

// Update saves the entry and its SEO row in one transaction.
func (r *Repository) Update(ctx context.Context, e *content.Entry) error {
	return pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			update cms.entries
			set title = $3, slug = $4, content = $5, excerpt = $6, status = $7, parent_id = $8,
			    menu_order = $9, template = $10, featured_media_id = $11, fields = $12, published_at = $13
			where type = $1 and id = $2
			returning path, updated_at`,
			e.Type, e.ID, e.Title, e.Slug, e.Content, e.Excerpt, e.Status, e.ParentID,
			e.MenuOrder, e.Template, e.FeaturedMediaID, fieldsOrEmpty(e.Fields), e.PublishedAt,
		).Scan(&e.Path, &e.UpdatedAt)
		if errors.Is(err, pgx.ErrNoRows) {
			return apperr.NotFound("entry not found")
		}
		if err != nil {
			return mapWriteError(err)
		}
		return saveSEO(ctx, tx, e.ID, e.SEO)
	})
}

func saveSEO(ctx context.Context, tx pgx.Tx, id uuid.UUID, m seo.Meta) error {
	_, err := tx.Exec(ctx, `
		insert into cms.seo_data (entry_id, meta_title, meta_description, focus_keyword, canonical_url,
		                          og_title, og_description, og_image_id, og_image_url, no_index, no_follow,
		                          seo_score, readability_score)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		on conflict (entry_id) do update set
			meta_title = excluded.meta_title, meta_description = excluded.meta_description,
			focus_keyword = excluded.focus_keyword, canonical_url = excluded.canonical_url,
			og_title = excluded.og_title, og_description = excluded.og_description,
			og_image_id = excluded.og_image_id, og_image_url = excluded.og_image_url,
			no_index = excluded.no_index, no_follow = excluded.no_follow,
			seo_score = excluded.seo_score, readability_score = excluded.readability_score`,
		id, m.MetaTitle, m.MetaDescription, m.FocusKeyword, m.CanonicalURL,
		m.OGTitle, m.OGDescription, m.OGImageID, m.OGImageURL, m.NoIndex, m.NoFollow,
		m.SEOScore, m.ReadabilityScore)
	if err != nil {
		return mapWriteError(err)
	}
	return nil
}

// Delete removes an entry; its SEO row goes with it (ON DELETE CASCADE).
func (r *Repository) Delete(ctx context.Context, typ string, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `delete from cms.entries where type = $1 and id = $2`, typ, id)
	if pgErr, ok := database.PgError(err); ok && pgErr.Code == database.CodeForeignKeyViolation {
		return apperr.Conflict("this entry has child entries; move or delete them first")
	}
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NotFound("entry not found")
	}
	return nil
}

// Get loads one entry by ID.
func (r *Repository) Get(ctx context.Context, typ string, id uuid.UUID) (*content.Entry, error) {
	return r.getOne(ctx, selectEntry+` where e.type = $1 and e.id = $2`, typ, id)
}

// GetByPath loads one entry by its full path.
func (r *Repository) GetByPath(ctx context.Context, typ, path string) (*content.Entry, error) {
	return r.getOne(ctx, selectEntry+` where e.type = $1 and e.path = $2`, typ, path)
}

func (r *Repository) getOne(ctx context.Context, sql string, args ...any) (*content.Entry, error) {
	e, err := scanEntry(r.pool.QueryRow(ctx, sql, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, apperr.NotFound("entry not found")
	}
	return e, err
}

var orderBy = map[content.Order]string{
	content.OrderMenu:    "e.menu_order, e.title, e.id",
	content.OrderNewest:  "e.published_at desc nulls last, e.created_at desc, e.id",
	content.OrderUpdated: "e.updated_at desc, e.id",
}

// List returns one page of entries matching f, and the total match count.
func (r *Repository) List(ctx context.Context, f content.ListFilter) ([]*content.Entry, int, error) {
	var w database.Where
	w.Add("e.type = ?", f.Type)
	if len(f.Statuses) > 0 {
		statuses := make([]string, len(f.Statuses))
		for i, s := range f.Statuses {
			statuses[i] = string(s)
		}
		w.Add("e.status = any(?)", statuses)
	}
	if f.LiveAt != nil {
		w.Add("e.published_at <= ?", *f.LiveAt)
	}
	if f.ParentID != nil {
		w.Add("e.parent_id = ?", *f.ParentID)
	} else if f.RootOnly {
		w.Add("e.parent_id is null")
	}
	if f.Search != "" {
		p := database.LikePattern(f.Search)
		w.Add("(e.title ilike ? or e.slug ilike ? or e.excerpt ilike ?)", p, p, p)
	}
	keys := make([]string, 0, len(f.Fields))
	for k := range f.Fields {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		w.Add("e.fields ->> ? = ?", k, f.Fields[k])
	}

	order, ok := orderBy[f.Order]
	if !ok {
		order = orderBy[content.OrderNewest]
	}

	var total int
	if err := r.pool.QueryRow(ctx, `select count(*) from cms.entries e `+w.SQL(), w.Args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count entries: %w", err)
	}
	limit, offset := w.Arg(f.Limit), w.Arg(f.Offset)
	rows, err := r.pool.Query(ctx, strings.Join([]string{selectEntry, w.SQL(), "order by", order, "limit", limit, "offset", offset}, " "), w.Args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list entries: %w", err)
	}
	defer rows.Close()

	entries := []*content.Entry{}
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, 0, err
		}
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}

func fieldsOrEmpty(f map[string]any) map[string]any {
	if f == nil {
		return map[string]any{}
	}
	return f
}

// mapWriteError turns constraint violations into user-facing errors.
func mapWriteError(err error) error {
	pgErr, ok := database.PgError(err)
	if !ok {
		return err
	}
	switch {
	case pgErr.Code == database.CodeUniqueViolation && pgErr.ConstraintName == "entries_type_path_key":
		return &apperr.Error{Code: apperr.CodeConflict, Message: "another entry already uses this slug at this level",
			Fields: map[string]string{"slug": "is already taken"}, Err: err}
	case pgErr.Code == database.CodeForeignKeyViolation:
		field := map[string]string{
			"entries_parent_id_fkey":         "parent_id",
			"entries_featured_media_id_fkey": "featured_media_id",
			"seo_data_og_image_id_fkey":      "seo.og_image_id",
		}[pgErr.ConstraintName]
		if field == "" {
			field = "reference"
		}
		return &apperr.Error{Code: apperr.CodeInvalid, Message: "a referenced item does not exist",
			Fields: map[string]string{field: "not found"}, Err: err}
	case pgErr.Code == database.CodeCheckViolation:
		return &apperr.Error{Code: apperr.CodeInvalid, Message: pgErr.Message, Err: err}
	}
	return err
}
