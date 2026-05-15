# v10.0.0 Frontend Release Checklist

Use this checklist before tagging `agentic-ecommerce-web` `v10.0.0`. The
semver tag remains uncut until the post-v9 hardening scope is green on
`primary-testing`.

## Preconditions

- `v9.0.0` is published and its final evidence is merged.
- Post-v9 defect harvest is triaged into fixed issues vs accepted
  carry-forwards.
- `README.md`, `CHANGELOG.md`, and `docs/v10-frontend-release-final.md` all
  describe the same release scope.
- Generated API types are refreshed against the backend contract intended for
  `v10.0.0`.

## Contract Gates

- Stable backend HTTP/SSE contracts exist for agent activity, agent status,
  sync events, marketplace/media/admin flows, and AI suggestion paths.
- Frontend polling and `bff_fallback` are no longer the happy path for the
  release-critical flows.
- The web client consumes generated API types and adapter layers only.
- Future Flutter work can target the same backend contract without requiring a
  mobile-only fork or parallel BFF.

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
bun run test src/release-metadata.test.ts
```

Target release threshold: TypeScript, ESLint, unit tests, production build, the
metadata guard, and stable Playwright all pass with no unexplained regressions.

## Primary Release Lane Gates

```bash
runx test-lane run --lane frontend-playwright-stable --pool primary-testing
runx test-lane run --lane full-stack-e2e --pool primary-testing
runx test-lane run --lane cleanup-testing --pool primary-testing
runx test-lane run --lane frontend-uiauto-compare --pool primary-testing
```

Expected result: stable Playwright, full-stack E2E, cleanup, and UIAuto all
pass on the blocking primary lane.

## Security And Public Boundary Gates

```bash
runx shell-leak-scan --repo agentic-ecommerce-web
bun run qa:security
sentrux gate .
```

Review docs-inclusive output before merge. Public docs must not contain live
credentials, private fleet hostnames, internal IPs, personal filesystem paths,
browser profiles, raw webhook secrets, or direct MiniMax app-service calls.

## Release Notes

Release notes should include:

- Frontend and backend commit SHAs used for promotion.
- Primary-lane results, including UIAuto evidence.
- Docker image tag.
- Backend OpenAPI contract SHA/path.
- Evidence that generated API types and SSE-backed flows are the happy path.
- Any skipped gates with operator-approved rationale.
