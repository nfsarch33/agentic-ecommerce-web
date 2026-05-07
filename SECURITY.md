# Security Policy

This public frontend repository is safe to publish only while it contains
generic source, tests, documentation, and redacted deployment examples. Do not
commit live operational data or local environment files.

Never commit:

- `.env` files or exported environment dumps
- JWT signing keys, refresh tokens, API keys, or session cookies
- WooCommerce, MiniMax, OpenAI, GitHub, AWS, 1Password, JFrog, or other tokens
- Private fleet hostnames, internal IPs, OCI IDs, or Tailscale node details
- Browser profiles, screenshots, HAR files, or traces containing account data
- Customer, order, candidate, proposal, or application data

## Frontend security boundary

The frontend may hide admin controls based on roles, but RBAC must be enforced
by the Go backend. Treat UI role checks as usability only.

JWT access tokens should be short-lived. Refresh tokens must be stored in
HTTP-only, secure, same-site cookies or kept server-side by the backend; they
must not be exposed through `NEXT_PUBLIC_*` variables or browser storage.

## Network policy

This app must not call `api.minimaxi.com` or `*.minimaxi.com` directly. AI
routes go through the approved bridge supplied by `FLEET_AI_BRIDGE_URL`; the
BFF validates that URL before use.

## CSP and deployment headers

Set browser security headers in the deployment platform, CDN, reverse proxy, or
Next.js hosting layer:

- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` or `frame-ancestors 'none'` in CSP
- `Permissions-Policy` with only explicitly required browser APIs

Start CSP from a deny-by-default baseline and explicitly allow the storefront,
Go backend, approved image/media hosts, and BFF endpoints.

## Reporting

Report vulnerabilities privately through GitHub security advisories.
