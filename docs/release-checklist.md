# v1.8.0 Frontend QA Checklist

Use this checklist before promoting `agentic-ecommerce-web` for the v1.8.0
frontend QA, Lighthouse, bundle, and security refresh milestone.

## Version and Docs

- `package.json` versioning is intentionally unchanged unless a frontend release tag is being cut.
- `CHANGELOG.md` includes the cloud deployment readiness entry when a release tag is prepared.
- `README.md` links quickstart, architecture, deployment, BFF routes, quality gates, and security boundaries.
- `docs/deployment.md` documents Docker Compose, AWS/GCP deployment notes, health checks, CDN/media, reverse proxy/TLS, environment variables, and security headers.
- `docs/v180-frontend-qa.md` documents Lighthouse, bundle budget, stable E2E, contract, and security gates.
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

Expected result: generated schema reflects the backend `api/openapi.yaml` intended for v1.0.0, and any diff is reviewed with the backend PR.

## Deployment Gates

```bash
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v1.7.0} .
```

Then run the full-stack Docker Compose smoke from the backend repo using the matching `WEB_IMAGE_TAG`. AWS ECS/GCP Cloud Run infrastructure remains backend/infra-owned; the frontend artifact is ready when the image builds and `/healthz` plus `/readyz` behave as documented.

## Security and Public Boundary Gates

```bash
runx shell-leak-scan --repo agentic-ecommerce-web
bun run qa:security
sentrux gate .
```

Review docs-inclusive output before merge. Public docs must not contain live credentials, private fleet hostnames, internal IPs, personal filesystem paths, account IDs, project IDs, browser profiles, or direct MiniMax app-service calls.

## Release Notes

The GitHub release notes should include:

- Frontend and backend commit SHAs used for promotion.
- Docker image tag.
- Backend OpenAPI contract SHA/path.
- BFF routes enabled for the release.
- Any skipped gates with operator-approved rationale.
