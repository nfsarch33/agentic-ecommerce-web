# v6.5.0 Frontend Performance and SEO Gate

This document records the v6.5.0 frontend quality slice for the EC v6.1.x -> v6.6.0 cleanup cycle.

## Scope

- Fix the ESLint 9 + Next.js 16 flat-config circular-reference failure.
- Keep public and dynamic storefront pages indexable with explicit metadata.
- Add JSON-LD structured data to product and marketplace plugin detail pages.
- Prove Lighthouse Performance and SEO >= 90 on static public routes and backend-backed routes using the production build.
- Capture the uiauto-vs-Playwright and EvoMap/EvoLoop follow-on notes for v7 planning.

## Changes

- `eslint.config.mjs` now imports the flat exports from `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` directly, avoiding the legacy `FlatCompat` path that crashes on circular plugin objects.
- `src/lib/seo-metadata.ts` centralizes canonical, robots, Open Graph, and Twitter metadata for public, private, and admin pages.
- `src/app/page.tsx` exports explicit indexable home metadata.
- `src/lib/structured-data.ts` builds Product and SoftwareApplication JSON-LD.
- `src/app/products/[slug]/page.tsx` emits Product JSON-LD from the fetched product.
- `src/app/marketplace/[slug]/page.tsx` emits SoftwareApplication JSON-LD from the fetched manifest.
- `src/components/AgentActivityFeed.tsx` and `src/components/LicenseKeyDisplay.tsx` avoid SSR/client hydration drift found during the Playwright smoke.

## Validation

All commands were run from the v6.5.0 worktree with local ignored dependencies materialized inside the worktree.

| Gate | Result |
|------|--------|
| `bun run lint` | PASS, zero warnings |
| `bun run typecheck` | PASS |
| `bun run test` | PASS, 227 files / 1089 tests |
| `bun run build` | PASS |
| `bun run test:e2e:stable` | PASS, 56 passed / 2 skipped |
| Hydration focused Playwright (`agent-activity`, `digital-flow`) | PASS, 4 passed |

## Lighthouse Evidence

Production server with static public routes:

| Route | Performance | Accessibility | Best Practices | SEO |
|-------|-------------|---------------|----------------|-----|
| `/` | 99 | 95 | 96 | 100 |
| `/developers` | 99 | 100 | 96 | 100 |
| `/developers/api` | 99 | 96 | 96 | 100 |
| `/developers/sdk` | 99 | 100 | 96 | 100 |
| `/register` | 99 | 100 | 96 | 100 |
| `/register/onboarding` | 99 | 100 | 96 | 100 |
| `/register/verify` | 99 | 100 | 96 | 100 |

Production server pointed at the local mock backend:

| Route | Performance | Accessibility | Best Practices | SEO |
|-------|-------------|---------------|----------------|-----|
| `/products` | 99 | 95 | 96 | 100 |
| `/products/resistance-band-set` | 98 | 95 | 96 | 100 |
| `/marketplace` | 99 | 94 | 96 | 100 |
| `/marketplace/stripe-payments` | 99 | 95 | 96 | 100 |
| `/marketplace/categories/payments` | 99 | 94 | 96 | 100 |
| `/marketplace/search?q=stripe` | 99 | 94 | 96 | 100 |

Raw reports were generated under `reports/lighthouse/` with `v650-*` names. That directory remains ignored so large HTML/JSON artifacts do not enter the public repo.

## Notes

- `bun install --frozen-lockfile` currently fails because the existing `bun.lock` wants updates. The worktree used hardlinked ignored `node_modules` from the canonical checkout to avoid incidental lockfile churn.
- The build wrapper records `reports/bundle/next-build-summary.json`; Next.js 16 Turbopack still does not emit route-size rows, so the bundle budget gate reports a pass with an explanatory note.
