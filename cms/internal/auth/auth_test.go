package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const issuer = "https://abcd.supabase.co/auth/v1"

func jwksFor(t *testing.T, kid string, pub *ecdsa.PublicKey) jwt.Keyfunc {
	t.Helper()
	b64 := func(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }
	raw, err := pub.Bytes() // 0x04 || X || Y
	if err != nil {
		t.Fatal(err)
	}
	x, y := raw[1:33], raw[33:]
	set, _ := json.Marshal(map[string]any{"keys": []map[string]string{{
		"kty": "EC", "crv": "P-256", "kid": kid, "alg": "ES256", "use": "sig", "x": b64(x), "y": b64(y),
	}}})
	k, err := keyfunc.NewJWKSetJSON(set)
	if err != nil {
		t.Fatal(err)
	}
	return k.Keyfunc
}

func tokenClaims(sub uuid.UUID, appMeta map[string]any) jwt.MapClaims {
	return jwt.MapClaims{
		"iss": issuer, "aud": "authenticated", "sub": sub.String(), "role": "authenticated",
		"email": "owner@example.com", "exp": time.Now().Add(time.Hour).Unix(), "app_metadata": appMeta,
	}
}

func sign(t *testing.T, method jwt.SigningMethod, key any, kid string, c jwt.Claims) string {
	t.Helper()
	tok := jwt.NewWithClaims(method, c)
	if kid != "" {
		tok.Header["kid"] = kid
	}
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestVerifier(t *testing.T) {
	key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	otherKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	secret := []byte("legacy-secret-at-least-32-bytes-long!!")
	v, err := NewVerifier(context.Background(), Config{
		Keyfunc: jwksFor(t, "k1", &key.PublicKey), HMACSecret: secret,
		Issuer: issuer, Audience: "authenticated", AllowedRoles: []string{"admin", "editor"},
	})
	if err != nil {
		t.Fatal(err)
	}
	user := uuid.New()
	admin := map[string]any{"cms_role": "admin", "provider": "email"}

	p, err := v.Verify(sign(t, jwt.SigningMethodES256, key, "k1", tokenClaims(user, admin)))
	if err != nil || p.UserID != user || p.Role != "admin" || p.Email != "owner@example.com" {
		t.Fatalf("ES256 admin: %+v, %v", p, err)
	}
	if _, err := v.Verify(sign(t, jwt.SigningMethodHS256, secret, "", tokenClaims(user, map[string]any{"cms_role": "editor"}))); err != nil {
		t.Errorf("HS256 editor rejected: %v", err)
	}

	expired := tokenClaims(user, admin)
	expired["exp"] = time.Now().Add(-time.Hour).Unix()
	wrongIss := tokenClaims(user, admin)
	wrongIss["iss"] = "https://evil.supabase.co/auth/v1"
	wrongAud := tokenClaims(user, admin)
	wrongAud["aud"] = "anon"
	noExp := tokenClaims(user, admin)
	delete(noExp, "exp")

	invalid := map[string]string{
		"garbage":     "not.a.token",
		"wrong key":   sign(t, jwt.SigningMethodES256, otherKey, "k1", tokenClaims(user, admin)),
		"unknown kid": sign(t, jwt.SigningMethodES256, key, "k2", tokenClaims(user, admin)),
		"wrong hmac":  sign(t, jwt.SigningMethodHS256, []byte("nope-nope-nope-nope-nope-nope-nope"), "", tokenClaims(user, admin)),
		"expired":     sign(t, jwt.SigningMethodES256, key, "k1", expired),
		"no exp":      sign(t, jwt.SigningMethodES256, key, "k1", noExp),
		"issuer":      sign(t, jwt.SigningMethodES256, key, "k1", wrongIss),
		"audience":    sign(t, jwt.SigningMethodES256, key, "k1", wrongAud),
		"alg none":    sign(t, jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, "", tokenClaims(user, admin)),
	}
	for name, tok := range invalid {
		if _, err := v.Verify(tok); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("%s: err = %v, want ErrInvalidToken", name, err)
		}
	}

	anon := tokenClaims(user, admin)
	anon["is_anonymous"] = true
	serviceRole := tokenClaims(user, admin)
	serviceRole["role"] = "service_role"
	selfPromoted := tokenClaims(user, map[string]any{})
	selfPromoted["user_metadata"] = map[string]any{"cms_role": "admin"} // users can edit this; must not count

	forbidden := map[string]jwt.MapClaims{
		"no role":       tokenClaims(user, map[string]any{}),
		"other role":    tokenClaims(user, map[string]any{"cms_role": "guest"}),
		"anonymous":     anon,
		"not a user":    serviceRole,
		"user_metadata": selfPromoted,
	}
	for name, c := range forbidden {
		if _, err := v.Verify(sign(t, jwt.SigningMethodES256, key, "k1", c)); !errors.Is(err, ErrForbidden) {
			t.Errorf("%s: err = %v, want ErrForbidden", name, err)
		}
	}
}

func TestHS256RejectedWithoutSecret(t *testing.T) {
	key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	v, err := NewVerifier(context.Background(), Config{
		Keyfunc: jwksFor(t, "k1", &key.PublicKey), Issuer: issuer, Audience: "authenticated", AllowedRoles: []string{"admin"},
	})
	if err != nil {
		t.Fatal(err)
	}
	tok := sign(t, jwt.SigningMethodHS256, []byte("whatever-whatever-whatever-whatever"), "", tokenClaims(uuid.New(), map[string]any{"cms_role": "admin"}))
	if _, err := v.Verify(tok); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("err = %v", err)
	}
}
