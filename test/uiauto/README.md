# test/uiauto

uiauto-framework comparison harness for the storefront and admin specs.
Introduced in v2.1.0; research-mode only (no CI gate). The backend's
`cmd/uiauto-compare` generator (in `agentic-ecommerce`) consumes the
files in this directory.

## Layout

| Path | Purpose |
|---|---|
| `scenarios/*.json` | One scenario per Playwright spec. Format documented at [`uiauto-framework/docs/scenario-format.md`](../../../../Code/personal/uiauto-framework/docs/scenario-format.md). |
| `plugins/auth_provider.go` | AdminCookieAuthProvider implementation that satisfies `pkg/uiauto/plugin.AuthProvider` (see [`uiauto-framework/docs/plugin-guide.md`](../../../../Code/personal/uiauto-framework/docs/plugin-guide.md) and [`uiauto-framework/pkg/uiauto/plugin/auth_provider.go`](../../../../Code/personal/uiauto-framework/pkg/uiauto/plugin/auth_provider.go)). |
| `plugins/auth_provider_test.go` | Table-driven coverage for the provider (login, refresh, cookie staging, error paths). |
| `fixtures/admin-credentials.example.json` | Sample credential bundle. Copy to `admin-credentials.json` (git-ignored) before running uiauto against a non-mock backend. |
| `CANDIDATES.md` | Which Playwright specs are highest-value targets for the comparison harness. |
| `REPORT_TEMPLATE.md` | The markdown shape the backend generator fills in for each comparison run. |

## Running locally

End-to-end this is driven from the backend repo:

```sh
# In agentic-ecommerce (canonical or worktree):
runx env scrub -- make uiauto-smoke         # builds the runner image, asserts CDP reachability
runx env scrub -- make uiauto-compare       # writes reports/uiauto-comparison/<date>/diff.json + summary.md
```

The backend's `make uiauto-compare` defaults to fixtures mode for
hermetic runs. Switch to `UIAUTO_COMPARE_MODE=runtime` after dumping
Playwright JSON reports and `demo-metrics.json` to disk to drive a real
comparison.

## AuthProvider seam

The AdminCookieAuthProvider is a frontend-side stub that implements the
upstream uiauto-framework AuthProvider seam without forking
uiauto-framework. Compile-time enforcement happens whenever the
framework is vendored alongside this file (search for `ProviderInterface`
in `auth_provider.go`).

Use it from a downstream Go runner:

```go
creds, err := authprovider.LoadCredentials("test/uiauto/fixtures/admin-credentials.json")
if err != nil { return err }
provider, err := authprovider.NewAdminCookieAuthProvider(authprovider.Config{
    Credentials:   creds,
    Role:          "operator",
    LoginEndpoint: "http://127.0.0.1:18080/api/v1/auth/login",
})
if err != nil { return err }
if err := provider.Authenticate(ctx); err != nil { return err }
for _, c := range provider.Cookies() {
    // chromedp.SetCookie equivalents go here.
}
```

## Open upstream issues

- [`nfsarch33/uiauto-framework#8`](https://github.com/nfsarch33/uiauto-framework/issues/8)
  -- upstream Dockerfile pins Go 1.24 while go.mod requires Go 1.26.
  Mitigated by `agentic-ecommerce/test/uiauto/Dockerfile.runner` until
  the upstream issue is fixed.
