# v1.0.0 Release Checklist

Use this checklist before tagging `agentic-ecommerce-web` v1.0.0.

## Version and Docs

- `package.json` contains `"version": "1.0.0"`.
- `CHANGELOG.md` includes the v1.0.0 release entry.
- `README.md` links quickstart, architecture, deployment, BFF routes, quality gates, and security boundaries.
- `docs/deployment.md` documents Docker Compose, AWS ECS/GCP Cloud Run dry-run references, environment variables, and security headers.
- `docs/bff-routes.md` documents frontend BFF route boundaries and upstream backend API links.

## Frontend Quality Gates

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build
bun run test:e2e
```

Target release threshold: TypeScript, ESLint, unit tests, production build, and Playwright smoke pass. Lighthouse performance should be at least 90 for the production build before final release publication.

## Contract Gates

```bash
bun run api:generate
git diff -- src/lib/adapters/api/generated/schema.d.ts
```

Expected result: generated schema reflects the backend `api/openapi.yaml` intended for v1.0.0, and any diff is reviewed with the backend PR.

## Deployment Gates

```bash
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v1.0.0} .
```

Then run the full-stack Docker Compose smoke from the backend repo using the matching `WEB_IMAGE_TAG`. AWS ECS and GCP Cloud Run remain dry-run paths for v1.0.0 and are referenced from the backend Terraform docs.

## Security and Public Boundary Gates

```bash
runx shell-leak-scan --repo agentic-ecommerce-web
sentrux scan .
```

Review docs-inclusive output before merge. Public docs must not contain live credentials, private fleet hostnames, internal IPs, personal filesystem paths, account IDs, project IDs, browser profiles, or direct MiniMax app-service calls.

## Release Notes

The GitHub release notes should include:

- Frontend and backend commit SHAs used for promotion.
- Docker image tag.
- Backend OpenAPI contract SHA/path.
- BFF routes enabled for the release.
- Any skipped gates with operator-approved rationale.
