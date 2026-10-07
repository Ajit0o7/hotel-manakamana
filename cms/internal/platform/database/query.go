package database

import (
	"errors"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// Postgres error codes the repositories react to.
const (
	CodeUniqueViolation     = "23505"
	CodeForeignKeyViolation = "23503"
	CodeCheckViolation      = "23514"
)

// PgError returns the Postgres error in err's chain, if any.
func PgError(err error) (*pgconn.PgError, bool) {
	var pgErr *pgconn.PgError
	ok := errors.As(err, &pgErr)
	return pgErr, ok
}

// Where accumulates SQL conditions with numbered placeholders.
type Where struct {
	conds []string
	Args  []any
}

// Add appends a condition. Each "?" in cond becomes a numbered placeholder
// bound to the next of args.
func (w *Where) Add(cond string, args ...any) {
	var b strings.Builder
	next := 0
	for i := 0; i < len(cond); i++ {
		if cond[i] != '?' {
			b.WriteByte(cond[i])
			continue
		}
		b.WriteString(w.Arg(args[next]))
		next++
	}
	w.conds = append(w.conds, b.String())
}

// Arg binds one more argument and returns its placeholder.
func (w *Where) Arg(v any) string {
	w.Args = append(w.Args, v)
	return "$" + strconv.Itoa(len(w.Args))
}

// SQL renders "where a and b", or "" when there are no conditions.
func (w *Where) SQL() string {
	if len(w.conds) == 0 {
		return ""
	}
	return "where " + strings.Join(w.conds, " and ")
}

// LikePattern escapes s for use in a LIKE/ILIKE "contains" pattern.
func LikePattern(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(s) + "%"
}
