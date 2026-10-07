// Package migrations embeds the SQL migrations, applied in file-name order
// by cmd/migrate. They can also be pasted into the Supabase SQL editor.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
