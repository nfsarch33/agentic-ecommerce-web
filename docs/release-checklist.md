# v9.0.0 Frontend Release Checklist

Use this checklist before tagging `agentic-ecommerce-web` v9.0.0. The semver
tag remains uncut until the full primary self-hosted regression is green on
`primary-testing`.

## Version and Docs

- `package.json` contains version `9.0.0`.
- `CHANGELOG.md` includes the v9.0.0 release entry.
- `README.md` links quickstart, architecture, deployment, BFF routes, admin operations, quality gates, and security boundaries.
- `README.md` also records that `v9.0.0` is still RC-only until the primary lane passes the self-hosted release gate.
- `docs/admin-operations.md` documents workflow status, Media Intelligence, tenant settings, compliance reporting, and n8n/webhook operations.
- `docs/deployment.md` documents Docker Compose, deferred cloud reference notes, health checks, CDN/media, reverse proxy/TLS, environment variables, and security headers.
- `docs/v180-frontend-qa.md` documents Lighthouse, bundle budget, stable E2E, contract, and security gates.
- `docs/v650-frontend-performance-seo.md`, `docs/uiauto-playwright-comparison.md`, `docs/v650-evomap-evoloop.md`, and `docs/v651-cross-cycle-kpi-dashboard.md` capture the v6.5.x performance, SEO, uiauto, KPI, and self-improvement evidence.
- `docs/v9-frontend-release-final.md` is ready to capture the v9.0.0 release evidence, primary-lane status, skipped gates, and carry-forwards.
- `docs/bff-routes.md` documents frontend BFF route boundaries and upstream backend API links.
- `.env.production.example` includes the production frontend origin, backend API URLs, CDN media URL, n8n URL, Temporal UI URL, and auth cookie security settings.

## Frontend Quality Gates

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run test:coverage
bun run build
bun run qa:bundle
bun run test:e2e:stable
```

Target release threshold: TypeScript, ESLint, unit tests, production build, and
Playwright smoke pass. `bun run build` enforces First Load JS < 200 kB.
Lighthouse performance and SEO should both be at least 90 for the production
build before final release publication. Local gates complement but do not
replace the primary release lane below.

## Lighthouse and Bundle Gates

```bash
bun run build
bun run start
LIGHTHOUSE_URL=http://127.0.0.1:3000/ bun run qa:lighthouse
```

Expected result: `reports/bundle/next-build-summary.json` and
`reports/lighthouse/*-summary.json` show the current release thresholds passing.

## Contract Gates

```bash
bun run api:generate
git diff -- src/lib/adapters/api/generated/schema.d.ts
```

Expected result: generated schema reflects the backend `api/openapi.yaml`
intended for v9.0.0, and any diff is reviewed with the backend PR.

## Self-Hosted Artifact Gates

```bash
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v9.0.0} .
```

Then run the full-stack Docker Compose smoke from the backend repo using the
matching `WEB_IMAGE_TAG`. Backend and infra docs may still describe cloud
deployment options, but those references are non-blocking for `v9.0.0`; the
frontend artifact is ready when the image builds and `/healthz` plus `/readyz`
behave as documented.

## Primary Pool Gates

```bash
runx test-lane run --lane frontend-playwright-stable --pool primary-testing
runx test-lane run --lane full-stack-e2e --pool primary-testing
runx test-lane run --lane cleanup-testing --pool primary-testing
runx test-lane run --lane frontend-uiauto-compare --pool primary-testing
```

Expected result: stable Playwright, full-stack E2E, cleanup, and UIAuto all
pass on `primary-testing`. Backend host canaries and backend-integration lanes are
tracked in the backend checklist and must also be green before the stack tag is
cut.

## Security and Public Boundary Gates

```bash
runx shell-leak-scan --repo agentic-ecommerce-web
bun run qa:security
sentrux gate .
```

Review docs-inclusive output before merge. Public docs must not contain live credentials, private fleet hostnames, internal IPs, personal filesystem paths, account IDs, project IDs, browser profiles, raw webhook secrets, n8n credentials, Temporal credentials, object-store keys, or direct MiniMax app-service calls.

## Release Notes

The GitHub release notes should include:

- Frontend and backend commit SHAs used for promotion.
- Primary-lane results, including UIAuto evidence.
- Docker image tag.
- Backend OpenAPI contract SHA/path.
- BFF routes enabled for the release.
- Any skipped gates with operator-approved rationale.
