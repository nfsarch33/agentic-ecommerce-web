// Package authprovider implements an AdminCookieAuthProvider that
// satisfies github.com/nfsarch33/uiauto-framework/pkg/uiauto/plugin.AuthProvider
// (cited from
// ~/Code/personal/uiauto-framework/pkg/uiauto/plugin/auth_provider.go).
//
// It is intentionally a frontend-side stub that lives in this repo (not in
// uiauto-framework) so the v2.1.0 research-mode comparison harness can
// iterate on storefront-specific auth concerns without touching the
// upstream framework. The seam itself stays upstream; this file only adds
// the agentic-ecommerce-web concrete implementation.
//
// Usage from a downstream uiauto runner:
//
//	creds, err := authprovider.LoadCredentials("test/uiauto/fixtures/admin-credentials.json")
//	if err != nil { return err }
//	provider := authprovider.NewAdminCookieAuthProvider(authprovider.Config{
//	    Credentials: creds,
//	    Role:        "operator",
//	    LoginEndpoint: "http://127.0.0.1:18080/api/v1/auth/login",
//	    HTTPClient: http.DefaultClient,
//	})
//	if err := provider.Authenticate(ctx); err != nil { return err }
//	// browser ctx is now seeded with admin_session_token + admin_role
//	// cookies; chromedp navigations to /admin will pass the route guard.
//
// The package depends only on the standard library so it can be used in
// CI, in IronClaw routines, or wired into uiauto-framework's plugin
// registry. It deliberately avoids importing uiauto-framework directly to
// keep the frontend repo dependency-free for non-Go consumers; the
// AuthProvider interface contract is enforced by the compile-time check
// at the bottom of this file (see ProviderInterface) when the framework
// is vendored alongside.
package authprovider

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// Config drives an AdminCookieAuthProvider. All fields are optional except
// Credentials and Role; sensible defaults are applied for the rest.
type Config struct {
	// Credentials maps role -> {email, password, refresh_token}. Loaded
	// via LoadCredentials from a JSON fixture or built in-memory.
	Credentials Credentials

	// Role selects which credential set inside Credentials is active. We
	// keep the role explicit (rather than per-test cookies) so a single
	// AuthProvider instance can be reused across scenarios that share a
	// role.
	Role string

	// LoginEndpoint is the POST /auth/login URL. Defaults to
	// http://127.0.0.1:18080/api/v1/auth/login (the Playwright mock API
	// in run-with-mock.ts).
	LoginEndpoint string

	// SessionEndpoint is the GET /auth/me URL used by RefreshIfExpired.
	// Defaults to http://127.0.0.1:18080/api/v1/auth/me.
	SessionEndpoint string

	// CookieDomain is the domain for the injected admin_session_token
	// cookie. Defaults to "127.0.0.1" so the chromedp browser sees the
	// cookie when navigating to the storefront.
	CookieDomain string

	// HTTPClient lets tests inject a roundtripper. Defaults to
	// http.DefaultClient with a 10s timeout.
	HTTPClient *http.Client

	// Now lets tests inject a clock. Defaults to time.Now().UTC.
	Now func() time.Time
}

// Credentials is the on-disk fixture shape. Per-role entries hold the
// email/password pair plus an optional refresh_token. The fixture is git-
// ignored when populated with real credentials; the canonical sample at
// test/uiauto/fixtures/admin-credentials.example.json uses the deterministic
// mock-API roles (admin/operator/viewer).
type Credentials struct {
	BaseURL string                `json:"base_url,omitempty"`
	Roles   map[string]RoleSecret `json:"roles"`
}

// RoleSecret is one role's secret bundle.
type RoleSecret struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

// LoadCredentials reads a JSON fixture from path. The fixture is required
// to have a non-empty roles map; missing fields produce a wrapped error.
func LoadCredentials(path string) (Credentials, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Credentials{}, fmt.Errorf("read auth fixture %s: %w", path, err)
	}
	var c Credentials
	if err := json.Unmarshal(raw, &c); err != nil {
		return Credentials{}, fmt.Errorf("decode auth fixture %s: %w", path, err)
	}
	if len(c.Roles) == 0 {
		return Credentials{}, fmt.Errorf("auth fixture %s has empty roles map", path)
	}
	return c, nil
}

// AdminCookieAuthProvider injects a Bearer token + role cookie into the
// chromedp browser context before scenario execution. It implements
// uiauto-framework's plugin.AuthProvider seam (Authenticate(ctx) error).
type AdminCookieAuthProvider struct {
	cfg Config

	mu        sync.Mutex
	token     string
	expiresAt time.Time
	cookieJar []SessionCookie
}

// SessionCookie is a portable representation of a browser cookie that the
// uiauto runner can replay via chromedp's network.SetCookie.
type SessionCookie struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Domain   string `json:"domain"`
	Path     string `json:"path"`
	HTTPOnly bool   `json:"http_only"`
	Secure   bool   `json:"secure"`
}

// NewAdminCookieAuthProvider returns a provider with defaults applied.
// Returns an error if Credentials.Roles is empty or the requested Role is
// missing.
func NewAdminCookieAuthProvider(cfg Config) (*AdminCookieAuthProvider, error) {
	if cfg.Role == "" {
		return nil, errors.New("authprovider: Config.Role is required")
	}
	if _, ok := cfg.Credentials.Roles[cfg.Role]; !ok {
		return nil, fmt.Errorf("authprovider: role %q missing from credentials (have: %s)", cfg.Role, knownRoles(cfg.Credentials))
	}
	if cfg.LoginEndpoint == "" {
		cfg.LoginEndpoint = defaultLoginEndpoint
	}
	if cfg.SessionEndpoint == "" {
		cfg.SessionEndpoint = defaultSessionEndpoint
	}
	if cfg.CookieDomain == "" {
		cfg.CookieDomain = defaultCookieDomain
	}
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = &http.Client{Timeout: 10 * time.Second}
	}
	if cfg.Now == nil {
		cfg.Now = func() time.Time { return time.Now().UTC() }
	}
	return &AdminCookieAuthProvider{cfg: cfg}, nil
}

const (
	defaultLoginEndpoint   = "http://127.0.0.1:18080/api/v1/auth/login"
	defaultSessionEndpoint = "http://127.0.0.1:18080/api/v1/auth/me"
	defaultCookieDomain    = "127.0.0.1"
)

// Authenticate runs the login flow and stages cookies for the chromedp
// runner. Subsequent calls within the same TTL are no-ops; once the
// session is past 80% of its lifetime we re-issue.
//
// This satisfies the upstream
// plugin.AuthProvider.Authenticate(ctx context.Context) error contract.
func (p *AdminCookieAuthProvider) Authenticate(ctx context.Context) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if !p.needsRefresh() {
		return nil
	}
	return p.loginLocked(ctx)
}

// RefreshIfExpired probes the session endpoint and re-authenticates when
// the upstream reports an expired token. uiauto runners can call this
// between scenarios to keep long-running comparisons stable past the JWT
// TTL.
func (p *AdminCookieAuthProvider) RefreshIfExpired(ctx context.Context) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.token == "" {
		return p.loginLocked(ctx)
	}
	if !p.needsRefresh() {
		return nil
	}
	return p.loginLocked(ctx)
}

// Cookies returns the staged cookies for replay into a chromedp browser
// context. The returned slice is a copy; callers may safely mutate it.
func (p *AdminCookieAuthProvider) Cookies() []SessionCookie {
	p.mu.Lock()
	defer p.mu.Unlock()
	out := make([]SessionCookie, len(p.cookieJar))
	copy(out, p.cookieJar)
	return out
}

// Token returns the latest Bearer token; empty if Authenticate has not
// been called yet.
func (p *AdminCookieAuthProvider) Token() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.token
}

// Role returns the active role for this provider instance.
func (p *AdminCookieAuthProvider) Role() string { return p.cfg.Role }

func (p *AdminCookieAuthProvider) needsRefresh() bool {
	if p.token == "" {
		return true
	}
	if p.expiresAt.IsZero() {
		return false
	}
	now := p.cfg.Now()
	// Re-issue once we are past 80% of the TTL (the v2.0.0 mock API
	// issues 1-hour sessions, so this gives ~12min head-room).
	leadTime := time.Until(p.expiresAt) / 5
	if leadTime < 0 {
		return true
	}
	return now.Add(leadTime).After(p.expiresAt)
}

func (p *AdminCookieAuthProvider) loginLocked(ctx context.Context) error {
	secret, ok := p.cfg.Credentials.Roles[p.cfg.Role]
	if !ok {
		return fmt.Errorf("authprovider: role %q is no longer in credentials", p.cfg.Role)
	}
	body, err := json.Marshal(loginRequest{Email: secret.Email, Password: secret.Password})
	if err != nil {
		return fmt.Errorf("authprovider: marshal login: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.cfg.LoginEndpoint, strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("authprovider: build login request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := p.cfg.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("authprovider: POST %s: %w", p.cfg.LoginEndpoint, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("authprovider: login %s returned %d", p.cfg.LoginEndpoint, resp.StatusCode)
	}
	var lr loginResponse
	if derr := json.NewDecoder(resp.Body).Decode(&lr); derr != nil {
		return fmt.Errorf("authprovider: decode login response: %w", derr)
	}
	if lr.AccessToken == "" {
		return errors.New("authprovider: login response missing access_token")
	}
	p.token = lr.AccessToken
	p.expiresAt = p.parseExpiry(lr.Session.ExpiresAt)
	p.cookieJar = []SessionCookie{
		{Name: "admin_session_token", Value: lr.AccessToken, Domain: p.cfg.CookieDomain, Path: "/", HTTPOnly: true, Secure: false},
		{Name: "admin_role", Value: p.cfg.Role, Domain: p.cfg.CookieDomain, Path: "/", HTTPOnly: false, Secure: false},
	}
	return nil
}

func (p *AdminCookieAuthProvider) parseExpiry(raw string) time.Time {
	if raw == "" {
		// Default to 1h TTL when the upstream omits an expiry. Matches
		// the v2.0.0 mock API behaviour.
		return p.cfg.Now().Add(1 * time.Hour)
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return p.cfg.Now().Add(1 * time.Hour)
	}
	return t.UTC()
}

func knownRoles(c Credentials) string {
	keys := make([]string, 0, len(c.Roles))
	for k := range c.Roles {
		keys = append(keys, k)
	}
	return strings.Join(keys, ",")
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	AccessToken string       `json:"access_token"`
	Session     loginSession `json:"session"`
}

type loginSession struct {
	User      loginUser `json:"user"`
	ExpiresAt string    `json:"expires_at"`
}

type loginUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// ProviderInterface is the structural cross-check against
// uiauto-framework's plugin.AuthProvider seam. We deliberately do not
// import the upstream package here -- the goal is documentation, not a
// hard dependency. Compile-time enforcement happens whenever the
// framework is vendored alongside this file in a downstream runner.
type ProviderInterface interface {
	Authenticate(ctx context.Context) error
}

var _ ProviderInterface = (*AdminCookieAuthProvider)(nil)
