package imaging

import (
	"bytes"
	"context"
	"encoding/binary"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"

	"github.com/gen2brain/webp"
)

// gradient returns a w×h image whose top-left pixel is red and whose
// top-right pixel is blue, so rotations can be checked.
func gradient(w, h int) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			img.Set(x, y, color.NRGBA{R: uint8(255 * (w - 1 - x) / (w - 1)), B: uint8(255 * x / (w - 1)), G: uint8(255 * y / (h - 1)), A: 255})
		}
	}
	return img
}

func encodeJPEG(t *testing.T, img image.Image, orientation int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 95}); err != nil {
		t.Fatal(err)
	}
	data := buf.Bytes()
	if orientation == 0 {
		return data
	}
	// Splice an APP1 Exif segment with one IFD entry right after SOI.
	tiff := make([]byte, 26)
	copy(tiff, "MM")
	binary.BigEndian.PutUint16(tiff[2:], 42)
	binary.BigEndian.PutUint32(tiff[4:], 8)
	binary.BigEndian.PutUint16(tiff[8:], 1)       // one entry
	binary.BigEndian.PutUint16(tiff[10:], 0x0112) // Orientation
	binary.BigEndian.PutUint16(tiff[12:], 3)      // SHORT
	binary.BigEndian.PutUint32(tiff[14:], 1)      // count
	binary.BigEndian.PutUint16(tiff[18:], uint16(orientation))
	payload := append([]byte("Exif\x00\x00"), tiff...)
	seg := []byte{0xFF, 0xE1, 0, 0}
	binary.BigEndian.PutUint16(seg[2:], uint16(len(payload)+2))
	seg = append(seg, payload...)
	return append(append([]byte{0xFF, 0xD8}, seg...), data[2:]...)
}

func TestJPEGOrientation(t *testing.T) {
	img := gradient(8, 4)
	for o := 1; o <= 8; o++ {
		if got := jpegOrientation(encodeJPEG(t, img, o)); got != o {
			t.Errorf("orientation %d read as %d", o, got)
		}
	}
	if got := jpegOrientation(encodeJPEG(t, img, 0)); got != 1 {
		t.Errorf("no EXIF read as %d", got)
	}
	if got := jpegOrientation([]byte("not a jpeg")); got != 1 {
		t.Errorf("garbage read as %d", got)
	}
}

func TestOrient(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 3, 2))
	red := color.NRGBA{R: 255, A: 255}
	src.Set(0, 0, red) // top-left marker
	for o, want := range map[int]image.Point{
		1: {0, 0}, 2: {2, 0}, 3: {2, 1}, 4: {0, 1},
		5: {0, 0}, 6: {1, 0}, 7: {1, 2}, 8: {0, 2},
	} {
		out := orient(src, o)
		if o >= 5 && (out.Bounds().Dx() != 2 || out.Bounds().Dy() != 3) {
			t.Errorf("orientation %d: bounds %v, want 2×3", o, out.Bounds())
		}
		if got := color.NRGBAModel.Convert(out.At(want.X, want.Y)); got != red {
			t.Errorf("orientation %d: marker not at %v", o, want)
		}
	}
}

func TestProcessGeneratesRenditions(t *testing.T) {
	p := NewProcessor()
	// A 2000×1000 photo stored sideways (orientation 6 = rotate 90° clockwise).
	res, err := p.Process(context.Background(), encodeJPEG(t, gradient(2000, 1000), 6))
	if err != nil {
		t.Fatal(err)
	}
	if res.Width != 1000 || res.Height != 2000 {
		t.Errorf("original size = %d×%d, want 1000×2000 after rotation", res.Width, res.Height)
	}
	want := map[string][3]any{
		"thumbnail": {300, 300, "image/webp"},
		"medium":    {768, 1536, "image/webp"},
		"large":     {800, 1600, "image/webp"},
		"og":        {1000, 525, "image/jpeg"}, // too small for 1200×630: cropped at source resolution
	}
	if len(res.Renditions) != len(want) {
		t.Fatalf("got %d renditions", len(res.Renditions))
	}
	for _, r := range res.Renditions {
		w := want[r.Name]
		if r.Width != w[0] || r.Height != w[1] || r.MimeType != w[2] {
			t.Errorf("%s = %d×%d %s, want %v", r.Name, r.Width, r.Height, r.MimeType, w)
		}
		var cfg image.Config
		if r.MimeType == "image/webp" {
			cfg, err = webp.DecodeConfig(bytes.NewReader(r.Data))
		} else {
			cfg, err = jpeg.DecodeConfig(bytes.NewReader(r.Data))
		}
		if err != nil || cfg.Width != r.Width || cfg.Height != r.Height {
			t.Errorf("%s: decoded %v, %v", r.Name, cfg, err)
		}
		if r.Name == "large" {
			// The source's red top-left corner must end up top-right once
			// rotated 90° clockwise.
			img, err := webp.Decode(bytes.NewReader(r.Data))
			if err != nil {
				t.Fatal(err)
			}
			c := color.NRGBAModel.Convert(img.At(r.Width-2, 1)).(color.NRGBA)
			if c.R < 200 || c.B > 60 {
				t.Errorf("large: top-right pixel = %v, want red (rotation not applied?)", c)
			}
		}
	}
}

func TestProcessSmallPNGIsNotUpscaled(t *testing.T) {
	var buf bytes.Buffer
	png.Encode(&buf, gradient(200, 100))
	res, err := NewProcessor().Process(context.Background(), buf.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	for _, r := range res.Renditions {
		if r.Width > 200 || r.Height > 100 {
			t.Errorf("%s upscaled to %d×%d", r.Name, r.Width, r.Height)
		}
	}
}

func TestProcessRejectsHugeAndBrokenImages(t *testing.T) {
	p := NewProcessor()
	p.MaxPixels = 100
	var buf bytes.Buffer
	png.Encode(&buf, gradient(20, 20))
	if _, err := p.Process(context.Background(), buf.Bytes()); err != ErrTooLarge {
		t.Errorf("err = %v, want ErrTooLarge", err)
	}
	if _, err := NewProcessor().Process(context.Background(), []byte("\x89PNG\r\n\x1a\nbroken")); err == nil {
		t.Error("broken image accepted")
	}
}
