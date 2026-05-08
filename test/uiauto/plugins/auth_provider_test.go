package authprovider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoadCredentials_FixtureRoundtrip(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	path := filepath.Join(dir, "creds.json")
	creds := Credentials{
		BaseURL: "http://127.0.0.1:18080",
		Roles: map[string]RoleSecret{
			"viewer":   {Email: "viewer@example.com", Password: "viewer-password"},
			"operator": {Email: "operator@example.com", Password: "operator-password"},
		},
	}
	raw, err := json.Marshal(creds)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, raw, 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := LoadCredentials(path)
	if err != nil {
		t.Fatalf("LoadCredentials: %v", err)
	}
	if got.BaseURL != creds.BaseURL || len(got.Roles) != 2 {
		t.Fatalf("roundtrip mismatch: %+v", got)
	}
}

func TestLoadCredentials_RejectsEmptyRoles(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	path := filepath.Join(dir, "creds.json")
	if err := os.WriteFile(path, []byte(`{}`), 0o600); err != nil {
		t.Fatal(err)
	}
	_, err := LoadCredentials(path)
	if err == nil {
		t.Fatal("expected empty-roles error")
	}
}

func TestNewAdminCookieAuthProvider_RequiresKnownRole(t *testing.T) {
	t.Parallel()
	creds := Credentials{Roles: map[string]RoleSecret{"viewer": {Email: "v@example.com", Password: "x"}}}
	if _, err := NewAdminCookieAuthProvider(Config{Credentials: creds, Role: ""}); err == nil {
		t.Fatal("expected error for missing role")
	}
	if _, err := NewAdminCookieAuthProvider(Config{Credentials: creds, Role: "ghost"}); err == nil {
		t.Fatal("expected error for unknown role")
	}
}

func TestAuthenticate_StagesCookiesAndToken(t *testing.T) {
	t.Parallel()
	srv := newMockLoginServer(t, mockResponse{accessToken: "viewer-token", role: "viewer", expires: "2026-05-08T10:00:00Z"})
	defer srv.Close()
	creds := Credentials{Roles: map[string]RoleSecret{"viewer": {Email: "viewer@example.com", Password: "viewer-password"}}}
	p, err := NewAdminCookieAuthProvider(Config{
		Credentials:   creds,
		Role:          "viewer",
		LoginEndpoint: srv.URL + "/api/v1/auth/login",
		Now:           func() time.Time { return time.Date(2026, 5, 8, 9, 0, 0, 0, time.UTC) },
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := p.Authenticate(context.Background()); err != nil {
		t.Fatalf("Authenticate: %v", err)
	}
	if p.Token() != "viewer-token" {
		t.Errorf("token got=%q want=viewer-token", p.Token())
	}
	cookies := p.Cookies()
	if len(cookies) != 2 {
		t.Fatalf("expected 2 cookies, got %d", len(cookies))
	}
	for _, c := range cookies {
		if c.Domain != "127.0.0.1" || c.Path != "/" {
			t.Errorf("cookie with bad domain/path: %+v", c)
		}
	}
	if p.Role() != "viewer" {
		t.Errorf("role got=%q want=viewer", p.Role())
	}
}

func TestAuthenticate_ReusesValidSession(t *testing.T) {
	t.Parallel()
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		respondLogin(t, w, mockResponse{accessToken: "tok", role: "operator", expires: "2026-05-08T10:00:00Z"})
	}))
	defer srv.Close()
	creds := Credentials{Roles: map[string]RoleSecret{"operator": {Email: "o@e.com", Password: "p"}}}
	p, _ := NewAdminCookieAuthProvider(Config{
		Credentials:   creds,
		Role:          "operator",
		LoginEndpoint: srv.URL + "/api/v1/auth/login",
		Now:           func() time.Time { return time.Date(2026, 5, 8, 9, 0, 0, 0, time.UTC) },
	})
	for i := 0; i < 3; i++ {
		if err := p.Authenticate(context.Background()); err != nil {
			t.Fatalf("Authenticate: %v", err)
		}
	}
	if calls != 1 {
		t.Errorf("expected 1 login call, got %d", calls)
	}
}

func TestRefreshIfExpired_RetriesAfterTTL(t *testing.T) {
	t.Parallel()
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		respondLogin(t, w, mockResponse{accessToken: "tok-fresh", role: "operator", expires: "2026-05-08T10:00:00Z"})
	}))
	defer srv.Close()
	creds := Credentials{Roles: map[string]RoleSecret{"operator": {Email: "o@e.com", Password: "p"}}}
	now := time.Date(2026, 5, 8, 9, 0, 0, 0, time.UTC)
	p, _ := NewAdminCookieAuthProvider(Config{
		Credentials:   creds,
		Role:          "operator",
		LoginEndpoint: srv.URL + "/api/v1/auth/login",
		Now:           func() time.Time { return now },
	})
	if err := p.Authenticate(context.Background()); err != nil {
		t.Fatal(err)
	}
	now = time.Date(2026, 5, 8, 11, 0, 0, 0, time.UTC) // past expiry
	if err := p.RefreshIfExpired(context.Background()); err != nil {
		t.Fatal(err)
	}
	if calls != 2 {
		t.Errorf("expected 2 login calls, got %d", calls)
	}
}

func TestAuthenticate_PropagatesNon2xx(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "no", http.StatusUnauthorized)
	}))
	defer srv.Close()
	creds := Credentials{Roles: map[string]RoleSecret{"v": {Email: "x", Password: "y"}}}
	p, _ := NewAdminCookieAuthProvider(Config{
		Credentials:   creds,
		Role:          "v",
		LoginEndpoint: srv.URL + "/api/v1/auth/login",
	})
	if err := p.Authenticate(context.Background()); err == nil {
		t.Fatal("expected error on 401")
	}
}

type mockResponse struct {
	accessToken string
	role        string
	expires     string
}

func newMockLoginServer(t *testing.T, resp mockResponse) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/v1/auth/login" {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		respondLogin(t, w, resp)
	}))
}

func respondLogin(t *testing.T, w http.ResponseWriter, resp mockResponse) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	body := map[string]any{
		"access_token": resp.accessToken,
		"session": map[string]any{
			"user":       map[string]any{"id": "u_" + resp.role, "email": resp.role + "@example.com", "role": resp.role},
			"expires_at": resp.expires,
		},
	}
	if err := json.NewEncoder(w).Encode(body); err != nil {
		t.Fatal(err)
	}
}
