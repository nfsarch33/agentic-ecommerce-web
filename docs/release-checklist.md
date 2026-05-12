# v8.0.0 Frontend Release Checklist

Use this checklist before tagging `agentic-ecommerce-web` v8.0.0.

## Version and Docs

- `package.json` contains version `8.0.0`.
- `CHANGELOG.md` includes the v8.0.0 release entry.
- `README.md` links quickstart, architecture, deployment, BFF routes, admin operations, quality gates, and security boundaries.
- `docs/admin-operations.md` documents workflow status, Media Intelligence, tenant settings, compliance reporting, and n8n/webhook operations.
- `docs/deployment.md` documents Docker Compose, AWS/GCP deployment notes, health checks, CDN/media, reverse proxy/TLS, environment variables, and security headers.
- `docs/v180-frontend-qa.md` documents Lighthouse, bundle budget, stable E2E, contract, and security gates.
- `docs/v650-frontend-performance-seo.md`, `docs/uiauto-playwright-comparison.md`, `docs/v650-evomap-evoloop.md`, and `docs/v651-cross-cycle-kpi-dashboard.md` capture the v6.5.x performance, SEO, uiauto, KPI, and self-improvement evidence.
- `docs/v8-frontend-release-final.md` captures v8.0.0 media UX release evidence, skipped gates, and carry-forwards.
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
build before final release publication.

## Lighthouse and Bundle Gates

```bash
bun run build
bun run start
LIGHTHOUSE_URL=http://127.0.0.1:3000/ bun run qa:lighthouse
```

Expected result: `reports/bundle/next-build-summary.json` and
`reports/lighthouse/*-summary.json` show all v1.8.0 thresholds passing.

## Contract Gates

```bash
bun run api:generate
git diff -- src/lib/adapters/api/generated/schema.d.ts
```

Expected result: generated schema reflects the backend `api/openapi.yaml` intended for v7.5.1, and any diff is reviewed with the backend PR.

## Deployment Gates

```bash
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v8.0.0} .
```

Then run the full-stack Docker Compose smoke from the backend repo using the matching `WEB_IMAGE_TAG`. AWS ECS/GCP Cloud Run infrastructure, Temporal, n8n, media object storage, and CDN provisioning remain backend/infra-owned; the frontend artifact is ready when the image builds and `/healthz` plus `/readyz` behave as documented.

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
- Docker image tag.
- Backend OpenAPI contract SHA/path.
- BFF routes enabled for the release.
- Any skipped gates with operator-approved rationale.
