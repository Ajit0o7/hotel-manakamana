// Package imaging generates resized WebP/JPEG renditions of uploaded images
// (thumbnails, responsive sizes, a social-card crop) before they are stored.
package imaging

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"math"

	// Register decoders for image.Decode.
	_ "image/gif"
	_ "image/png"

	"github.com/gen2brain/webp" // registers the WebP decoder too
	"golang.org/x/image/draw"
)

// Format is the output encoding of a rendition.
type Format string

const (
	WebP Format = "webp"
	JPEG Format = "jpeg"
)

// Size describes one rendition. With Crop, the image is scaled to cover
// Width×Height and centre-cropped. Without it, the image is scaled to fit
// inside the box; a zero Height means "any height". Images are never
// upscaled.
type Size struct {
	Name   string
	Width  int
	Height int
	Crop   bool
	Format Format
}

// DefaultSizes mirror WordPress' thumbnail/medium/large, plus a 1200×630
// JPEG crop for Open Graph cards (JPEG because not every social network
// accepts WebP).
var DefaultSizes = []Size{
	{Name: "thumbnail", Width: 300, Height: 300, Crop: true, Format: WebP},
	{Name: "medium", Width: 768, Format: WebP},
	{Name: "large", Width: 1600, Height: 1600, Format: WebP},
	{Name: "og", Width: 1200, Height: 630, Crop: true, Format: JPEG},
}

// Rendition is one generated image.
type Rendition struct {
	Name     string
	Data     []byte
	MimeType string
	Ext      string // with leading dot
	Width    int
	Height   int
}

// Result is the outcome of processing one upload.
type Result struct {
	// Width and Height of the original, after EXIF rotation.
	Width, Height int
	Renditions    []Rendition
}

// ErrTooLarge is returned for images whose pixel count exceeds MaxPixels.
var ErrTooLarge = errors.New("image dimensions are too large to process")

// Processor turns an uploaded image into renditions. It is safe for
// concurrent use and limits how many images are decoded at once, since
// decoding a large photo takes a lot of memory.
type Processor struct {
	Sizes     []Size
	Quality   int // 1–100, for both WebP and JPEG
	MaxPixels int
	sem       chan struct{}
}

// NewProcessor returns a processor with DefaultSizes.
func NewProcessor() *Processor {
	return &Processor{
		Sizes:     DefaultSizes,
		Quality:   80,
		MaxPixels: 50_000_000,
		sem:       make(chan struct{}, 2),
	}
}

// Supports reports whether renditions can be generated for the MIME type.
func (p *Processor) Supports(mime string) bool {
	switch mime {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
		return true
	}
	return false
}

// Process decodes data and generates every configured rendition.
func (p *Processor) Process(ctx context.Context, data []byte) (*Result, error) {
	select {
	case p.sem <- struct{}{}:
		defer func() { <-p.sem }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("read image header: %w", err)
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width*cfg.Height > p.MaxPixels {
		return nil, ErrTooLarge
	}
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	orientation := 1
	if format == "jpeg" {
		orientation = jpegOrientation(data)
	}
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	if orientation >= 5 { // 90° rotations swap the axes
		w, h = h, w
	}

	// Shrink once to a working copy no bigger than twice the largest
	// rendition, then rotate that. This keeps the expensive work small.
	limit := 0
	for _, s := range p.Sizes {
		limit = max(limit, s.Width, s.Height)
	}
	work := src
	if limit > 0 && max(w, h) > 2*limit {
		scale := float64(2*limit) / float64(max(w, h))
		sw, sh := src.Bounds().Dx(), src.Bounds().Dy()
		work = resize(src, src.Bounds(), round(float64(sw)*scale), round(float64(sh)*scale))
	}
	work = orient(work, orientation)

	res := &Result{Width: w, Height: h}
	for _, size := range p.Sizes {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		img := render(work, size)
		r, err := p.encode(img, size)
		if err != nil {
			return nil, fmt.Errorf("encode %s: %w", size.Name, err)
		}
		res.Renditions = append(res.Renditions, r)
	}
	return res, nil
}

// render scales (and for Crop sizes, centre-crops) src for one size.
func render(src image.Image, s Size) image.Image {
	b := src.Bounds()
	sw, sh := float64(b.Dx()), float64(b.Dy())

	if !s.Crop {
		scale := 1.0
		if s.Width > 0 {
			scale = math.Min(scale, float64(s.Width)/sw)
		}
		if s.Height > 0 {
			scale = math.Min(scale, float64(s.Height)/sh)
		}
		return resize(src, b, max(1, round(sw*scale)), max(1, round(sh*scale)))
	}

	tw, th := float64(s.Width), float64(s.Height)
	scale := math.Max(tw/sw, th/sh)
	if scale > 1 { // the source is smaller than the box: crop to its aspect ratio instead
		tw, th = tw/scale, th/scale
		scale = 1
	}
	cw, ch := tw/scale, th/scale // crop size in source pixels
	x0 := b.Min.X + round((sw-cw)/2)
	y0 := b.Min.Y + round((sh-ch)/2)
	crop := image.Rect(x0, y0, x0+round(cw), y0+round(ch))
	return resize(src, crop, max(1, round(tw)), max(1, round(th)))
}

func resize(src image.Image, from image.Rectangle, w, h int) image.Image {
	dst := image.NewNRGBA(image.Rect(0, 0, w, h))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, from, draw.Src, nil)
	return dst
}

func (p *Processor) encode(img image.Image, s Size) (Rendition, error) {
	var buf bytes.Buffer
	r := Rendition{Name: s.Name, Width: img.Bounds().Dx(), Height: img.Bounds().Dy()}
	switch s.Format {
	case JPEG:
		// JPEG has no alpha channel: flatten transparent PNGs onto white.
		flat := image.NewRGBA(img.Bounds())
		draw.Draw(flat, flat.Bounds(), image.NewUniform(color.White), image.Point{}, draw.Src)
		draw.Draw(flat, flat.Bounds(), img, img.Bounds().Min, draw.Over)
		if err := jpeg.Encode(&buf, flat, &jpeg.Options{Quality: p.Quality}); err != nil {
			return r, err
		}
		r.MimeType, r.Ext = "image/jpeg", ".jpg"
	default:
		if err := webp.Encode(&buf, img, webp.Options{Quality: p.Quality, Method: 4}); err != nil {
			return r, err
		}
		r.MimeType, r.Ext = "image/webp", ".webp"
	}
	r.Data = buf.Bytes()
	return r, nil
}

func round(f float64) int { return int(math.Round(f)) }
