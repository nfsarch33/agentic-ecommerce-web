# v6.5.0 EvoMap and EvoLoop Consolidation

This document summarizes the frontend lessons carried from EC v1 through v6.5.0 and converts them into reusable v7 inputs.

## Cross-Cycle Pattern Map

| Cycle | Signal | Carry-forward |
|-------|--------|---------------|
| v1-v2 | Public storefront needed a strict boundary from private backend logic | Keep BFF and adapter layers thin; never move business rules into UI |
| v2-v3 | Marketplace, payments, and tenant workflows increased route count quickly | Centralize metadata, route docs, and generated API contracts |
| v3-v4 | Dashboard and admin widgets created growing client bundles | Prefer server components and lazy route-local widgets |
| v4-v5 | QA drift appeared between README, release checklist, and actual scripts | Use docsync/report gates and keep quality commands single-sourced |
| v5-v6 | OOM and long-running agent risk became release blockers | Run browser, Lighthouse, Sentrux, and uiauto phases serially with cleanup between phases |
| v6.5.0 | Next.js 16 ESLint flat config and hydration drift surfaced during gates | Add config regression tests and treat Playwright console hydration warnings as quality defects |

## EvoLoop Inputs

- Test count increased to 1089 Vitest tests and 58 Playwright checks, with 56 passing and 2 expected skips in the stable smoke.
- Lighthouse public and mock-backed route matrix now clears Performance >= 98 and SEO = 100.
- Structured data was missing on the two most important dynamic public detail pages; Product and SoftwareApplication JSON-LD now cover them.
- The lockfile/dependency state needs cleanup in a later tooling slice: `bun install --frozen-lockfile` fails, so reproducible CI should refresh and review `bun.lock` deliberately rather than as an incidental build side effect.
- Turbopack bundle output no longer exposes route-size rows to the current parser. v7 should either add an analyzer path or update the budget script to read the current Next.js build artifact.

## v7 Recommendations

- Add a route-matrix manifest consumed by Lighthouse, Playwright, uiauto, and docs so route coverage cannot drift.
- Add a hydration-warning Playwright reporter that fails on React hydration mismatch logs.
- Add structured-data tests for every indexable dynamic public route.
- Add ignored NDJSON metric output for frontend quality gates so EvoLoop/DRL jobs ingest route, score, duration, warning count, and artifact path consistently.
- Keep live uiauto visual interpretation off developer laptops until the remote OmniParser route is registered and resource-guarded.
