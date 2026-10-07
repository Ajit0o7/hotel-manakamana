// Package auth verifies Supabase Auth access tokens and decides who may use
// the CMS admin API.
package auth

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Principal is the authenticated user behind a request.
type Principal struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	// Role is the CMS role from app_metadata.cms_role (e.g. "admin").
	Role string `json:"role"`
}

var (
	// ErrInvalidToken means the token is missing, malformed, expired or
	// not signed by the project.
	ErrInvalidToken = errors.New("invalid or expired access token")
	// ErrForbidden means the token is valid but the user is not a CMS admin.
	ErrForbidden = errors.New("this account is not allowed to manage content")
)

// Config configures a Verifier.
type Config struct {
	// JWKSURL is the project's public key set
	// (https://<ref>.supabase.co/auth/v1/.well-known/jwks.json). Used for
	// tokens signed with asymmetric keys (ES256/RS256), Supabase's default.
	JWKSURL string
	// HMACSecret is the legacy JWT secret. When set, HS256 tokens are
	// accepted too; leave empty once the project has rotated to signing keys.
	HMACSecret []byte
	// Issuer is the expected "iss" (https://<ref>.supabase.co/auth/v1).
	Issuer string
	// Audience is the expected "aud", normally "authenticated".
	Audience string
	// AllowedRoles lists the app_metadata.cms_role values given access.
	AllowedRoles []string

	// Keyfunc replaces the JWKS client; used by tests.
	Keyfunc jwt.Keyfunc
}

// Verifier checks Supabase access tokens.
type Verifier struct {
	cfg    Config
	jwks   jwt.Keyfunc
	parser *jwt.Parser
}

// NewVerifier builds a Verifier. The JWKS is fetched in the background and
// refreshed periodically and whenever a token names an unknown key ID; ctx
// ends the refresh goroutine.
func NewVerifier(ctx context.Context, cfg Config) (*Verifier, error) {
	if len(cfg.AllowedRoles) == 0 {
		return nil, errors.New("auth: no allowed roles configured")
	}
	jwks := cfg.Keyfunc
	if jwks == nil && cfg.JWKSURL != "" {
		k, err := keyfunc.NewDefaultOverrideCtx(ctx, []string{cfg.JWKSURL}, keyfunc.Override{
			HTTPTimeout: 10 * time.Second,
		})
		if err != nil {
			return nil, fmt.Errorf("auth: JWKS client: %w", err)
		}
		jwks = k.Keyfunc
	}
	if jwks == nil && len(cfg.HMACSecret) == 0 {
		return nil, errors.New("auth: configure a JWKS URL or an HMAC secret")
	}

	// Only accept the algorithms we have keys for, so an attacker cannot
	// pick one (e.g. "none", or HS256 signed with a public key).
	var methods []string
	if jwks != nil {
		methods = append(methods, "ES256", "RS256", "EdDSA")
	}
	if len(cfg.HMACSecret) > 0 {
		methods = append(methods, "HS256")
	}
	opts := []jwt.ParserOption{
		jwt.WithValidMethods(methods),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30 * time.Second),
	}
	if cfg.Issuer != "" {
		opts = append(opts, jwt.WithIssuer(cfg.Issuer))
	}
	if cfg.Audience != "" {
		opts = append(opts, jwt.WithAudience(cfg.Audience))
	}
	return &Verifier{cfg: cfg, jwks: jwks, parser: jwt.NewParser(opts...)}, nil
}

// claims are the parts of a Supabase access token we use.
type claims struct {
	jwt.RegisteredClaims
	Email       string         `json:"email"`
	Role        string         `json:"role"` // Postgres role: "authenticated"
	IsAnonymous bool           `json:"is_anonymous"`
	AppMetadata map[string]any `json:"app_metadata"`
}

// Verify checks token and returns the principal if they are a CMS admin.
//
// The CMS role is read from app_metadata, which only the service role can
// change. user_metadata is ignored: users can edit it themselves.
func (v *Verifier) Verify(token string) (*Principal, error) {
	var c claims
	if _, err := v.parser.ParseWithClaims(token, &c, v.keyFor); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	id, err := uuid.Parse(c.Subject)
	if err != nil {
		return nil, fmt.Errorf("%w: bad subject", ErrInvalidToken)
	}
	if c.Role != "authenticated" || c.IsAnonymous {
		return nil, ErrForbidden
	}
	role, _ := c.AppMetadata["cms_role"].(string)
	if !slices.Contains(v.cfg.AllowedRoles, role) {
		return nil, ErrForbidden
	}
	return &Principal{UserID: id, Email: c.Email, Role: role}, nil
}

func (v *Verifier) keyFor(t *jwt.Token) (any, error) {
	if _, ok := t.Method.(*jwt.SigningMethodHMAC); ok {
		if len(v.cfg.HMACSecret) == 0 {
			return nil, errors.New("HS256 tokens are not accepted")
		}
		return v.cfg.HMACSecret, nil
	}
	if v.jwks == nil {
		return nil, errors.New("asymmetric tokens are not accepted")
	}
	return v.jwks(t)
}
