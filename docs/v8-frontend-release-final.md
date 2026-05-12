# EC v8.0.0 Frontend Release Final Evidence

**Date**: 2026-05-13  
**Release**: `agentic-ecommerce-web` v8.0.0  
**Base**: v7.5.1 release tag  
**Head**: frontend `main` after PR #70 (`180b2f9`)

## Scope

v8.0.0 publishes the frontend media UX work already merged after v7.5.1:

- PR #69: product media variant review UX for generated product image variants.
- PR #70: QA evidence for Playwright/uiauto comparison readiness, hydration
  drift checks, and release documentation.

This release branch adds no product behavior. It aligns package, README,
changelog, release checklist, final evidence, and metadata guard tests with the
backend v8.0.0 publication.

## Release Gates

Required frontend release gates:

- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run typecheck`
- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run lint`
- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run test`
- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run build`
- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run test:e2e:stable`
- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run lighthouse:baseline`

Focused release metadata guard:

- `runx worktree run --repo agentic-ecommerce-web --branch release/v8-frontend-metadata -- bun run test src/release-metadata.test.ts`

## Observed Gate Results

- Metadata guard: PASS, 1 Vitest test.
- Diff/docs/no-shell checks: PASS.
- TypeScript: PASS, `bun run typecheck`.
- ESLint: PASS, `bun run lint`.
- Unit tests: PASS, 1,092 tests across 229 files.
- Production build: PASS, `bun run build`.
- Stable Playwright: PASS, 56 passed and 2 skipped.
- Lighthouse baseline: PASS after serving the production build on
  `127.0.0.1:3101`, with performance 99, accessibility 95, best-practices 96,
  and SEO 100. The first attempt without an explicit release server hit a Chrome
  interstitial on the default URL, so the release run pinned `LIGHTHOUSE_URL`.

## Carry-Forwards

- Live uiauto/OmniParser visual comparison remains remote-resource gated; do not
  run VLM workloads locally on the MacBook.
- Live marketplace/payment/carrier/social credentials remain operator-gated.
- Global-kb v8 release handoff follows after backend and frontend release tags
  are both published.
