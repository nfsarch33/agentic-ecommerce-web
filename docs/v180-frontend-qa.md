# v1.8.0 Frontend QA, Lighthouse, and Bundle Audit

This runbook captures the frontend gates for the v1.8.0 comprehensive QA milestone.

## Local Gate Sequence

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run test:coverage
bun run build
bun run test:e2e:stable
```

`bun run build` now wraps `next build` and writes `reports/bundle/next-build-summary.json`.
The enforced default budget is `BUNDLE_FIRST_LOAD_JS_LIMIT_KB=200`.

## Lighthouse

Run Lighthouse against a production server:

```bash
bun run build
bun run start
LIGHTHOUSE_URL=http://127.0.0.1:3000/ bun run qa:lighthouse
```

Defaults:

- performance >= 90
- accessibility >= 90
- best practices >= 90
- SEO >= 90

Reports are written to `reports/lighthouse/`. Override thresholds with
`LIGHTHOUSE_PERFORMANCE_MIN`, `LIGHTHOUSE_ACCESSIBILITY_MIN`,
`LIGHTHOUSE_BEST_PRACTICES_MIN`, and `LIGHTHOUSE_SEO_MIN`.

The v6.5.0 cleanup cycle expanded this gate to a static public route matrix
and backend-backed mock route matrix. See `docs/v650-frontend-performance-seo.md`
for the recorded scores and route list.

## Bundle Regression

The current v1.8.0 budget is intentionally conservative: every route must stay
under 200 kB First Load JS in the Next.js build table. The build wrapper fails if
any route exceeds the budget and records the largest route in
`reports/bundle/next-build-summary.json`.

Low-risk splitting guidance:

- Keep storefront pages server-rendered where possible.
- Avoid importing admin-only client widgets from public routes.
- Add `next/dynamic` only for route-local heavy widgets that are not needed for first paint.
- Re-check `reports/bundle/next-build-summary.json` after any new dashboard dependency.

## Contract and E2E Stability

Use `bun run contract:check` after backend OpenAPI changes. It regenerates the
frontend schema and fails when the generated contract diff is not committed.

Use `bun run test:e2e:stable` for the v1.8.0 browser gate. It keeps Chromium
serial with two retries, starts a fresh CI-style Next server on port 3100 plus
mock API on port 18180 to avoid stale local state, and writes the HTML report
under `.gitlab-artifacts/playwright/playwright-report/` with the lane log in
`.gitlab-artifacts/playwright/playwright-stable.log`. The script clears the
generated `.next` directory first so `next dev` never reads a stale production
build tree.

## Security Refresh

```bash
bun run qa:security
runx shell-leak-scan --repo agentic-ecommerce-web
sentrux gate .
```

`qa:security` runs gitleaks, `bun audit --audit-level=high`, Trivy filesystem
scan when available, shell-leak when available, and Sentrux when available. It
writes `reports/security/v180-security-refresh.json`.
