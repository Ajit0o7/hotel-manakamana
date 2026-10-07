package media

import (
	"io"
	"path/filepath"
	"strings"

	"github.com/gabriel-vasile/mimetype"
)

// fileType is an accepted upload type.
type fileType struct {
	kind Kind
	ext  string
}

// allowedTypes maps detected MIME types to the kinds we accept. SVG is left
// out on purpose: it can carry scripts and would be served from a public
// bucket. HTML and executables are never accepted.
var allowedTypes = map[string]fileType{
	"image/jpeg": {KindImage, ".jpg"},
	"image/png":  {KindImage, ".png"},
	"image/gif":  {KindImage, ".gif"},
	"image/webp": {KindImage, ".webp"},
	"image/avif": {KindImage, ".avif"},

	"video/mp4":       {KindVideo, ".mp4"},
	"video/webm":      {KindVideo, ".webm"},
	"video/quicktime": {KindVideo, ".mov"},

	"application/pdf": {KindDocument, ".pdf"},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   {KindDocument, ".docx"},
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         {KindDocument, ".xlsx"},
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": {KindDocument, ".pptx"},
	"text/plain": {KindDocument, ".txt"},
	"text/csv":   {KindDocument, ".csv"},
}

func init() {
	// Office documents are zip files; telling .docx from .xlsx can need more
	// than the default 3 KiB header.
	mimetype.SetLimit(64 << 10)
}

// detect sniffs the real type of a file from its content, ignoring the
// client-supplied Content-Type and file extension (except to tell CSV from
// plain text, which can look the same).
func detect(r io.Reader, filename string) (string, fileType, bool) {
	mt, err := mimetype.DetectReader(r)
	if err != nil {
		return "", fileType{}, false
	}
	mime, _, _ := strings.Cut(mt.String(), ";")
	if mime == "text/plain" && strings.EqualFold(filepath.Ext(filename), ".csv") {
		mime = "text/csv"
	}
	ft, ok := allowedTypes[mime]
	return mime, ft, ok
}
