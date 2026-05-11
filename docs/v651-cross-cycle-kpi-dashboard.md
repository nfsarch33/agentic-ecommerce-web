# v6.5.1 Cross-Cycle KPI Dashboard

This Pair 5 QA report consolidates the v6.1.x to v6.5.x evidence used to decide whether the EC cleanup cycle can move to Pair 6 release coordination.

## Pair 5 QA Checks

| Gate | Result | Evidence |
|---|---:|---|
| Frontend lint | PASS | `bun run lint` |
| Frontend typecheck | PASS | `bun run typecheck` |
| Frontend build | PASS | `bun run build` |
| Frontend unit/component tests | PASS | `bun run test`, 227 files / 1089 tests |
| Frontend stable E2E | PASS | `bun run test:e2e:stable`, 56 passed / 2 expected skips |
| ESLint config flake repeat | PASS | `src/lib/eslint-config.test.ts` targeted 3-run repeat passed; test timeout raised to 45s after one full-suite stress timeout |
| Lighthouse spot check | PASS | `/`, `/products/resistance-band-set`, `/marketplace/stripe-payments` all Performance >=98 and SEO 100 |
| Docs drift | PASS | `runx docs check --repo agentic-ecommerce-web` |
| Shell leak | PASS | `runx shell-leak-scan --repo agentic-ecommerce-web` |
| Public repo gate | PASS | `runx public-repo-gate --repo agentic-ecommerce-web` |
| Sentrux | PASS | Quality 6430, Coupling 0.03, Cycles 0, God files 0 |

Raw local QA artifacts are intentionally ignored:

- `reports/v651/vitest.log`
- `reports/v651/vitest-after-timeout-fix.log`
- `reports/lighthouse/v651-spot-*-summary.json`
- `reports/lighthouse/v651-spot-*.report.{json,html}`

## Lighthouse Spot Matrix

The spot check used the production Next server with the existing mock API fixtures.

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/` | 99 | 95 | 96 | 100 |
| `/products/resistance-band-set` | 99 | 95 | 96 | 100 |
| `/marketplace/stripe-payments` | 98 | 95 | 96 | 100 |

No post-merge Lighthouse drift was observed against the Pair 5 MVP route matrix.

## Cross-Cycle Backend KPIs

| Sprint | Backend quality | Coverage | complex_fn | Notable outcome |
|---|---:|---:|---:|---|
| v6.0.0 release | 6035 | 83.4% baseline | 5 | v6 release stabilized coupling at 0.06. |
| v6.1.0 MVP | 6047 | 84.6% | 5 | CF-12, CF-15, and CF-17 closed. |
| v6.1.1 QA | 6048 live / 6047 saved | 84.8% | 5 | Triple-run flake detection passed after two workerpool fixes. |
| v6.2.0 MVP | 6048 | 84.9% | 5 | Agentrace, JWT rotation, memwatch, and metrics slice shipped. |
| v6.2.1 QA | 6042 worktree | 84.8% durable | 5 | Agentrace/JWT/memwatch soak passed; coupling improved. |
| v6.3.0 MVP | 6039-6043 range | 84.8% | 5 | Real Postgres benches and k6 smoke shipped. |
| v6.3.1 QA | 6043 | 84.8% | 5 | Full k6 matrix passed at 100 RPS for 5 minutes with aggregate p95 8.06 ms. |
| v6.4.0 MVP | 6042 no-degradation | 84.8% durable | 5 | docsync tooling and EC README/ADR alignment shipped. |
| v6.4.1 QA | 6043 durable | 84.8% durable | 5 | Fleet docsync sweep completed; owned drift fixed. |

Pair 6 must still decide whether to close or explicitly carry these backend targets forward:

- Sentrux Quality >7000 remains open.
- Coverage >=85.0% remains open by roughly 0.2 percentage points.
- `complex_fn <= 4` remains open at 5.

## Cross-Cycle Frontend KPIs

| Sprint | Unit tests | E2E | Lighthouse | Sentrux | Notable outcome |
|---|---:|---:|---|---|---|
| v6.0.0 release | 1082 | 56 | Performance 68-95, SEO gap on dynamic pages | baseline not refreshed | Release shipped with frontend carry-forwards. |
| v6.4.0 MVP | 1082 durable | 56 durable | carried | Quality 6430 | README/package metadata aligned and stale Sentrux baseline refreshed. |
| v6.5.0 MVP | 1089 | 56 + 2 expected skips | Static 99/100, dynamic 98-99/100 | Quality 6430 | ESLint gate repaired, metadata/JSON-LD added, hydration drift fixed. |
| v6.5.1 QA | 1089 | 56 + 2 expected skips | Spot 98-99/100 | Quality 6430 | KPI dashboard added and warning hygiene promoted to metric. |

## Warning Hygiene Metric

The full Vitest suite still passes, but it emits React test-environment warnings:

| Metric | Value | Decision |
|---|---:|---|
| `ec_frontend_vitest_act_warning_count` | 14 | Track as a Pair 6 release-readiness metric; fix before v7 feature expansion if it grows or hides a real async state bug. |
| `ec_frontend_eslint_config_timeout_flake_count` | 1 observed under stress | Closed in this QA branch by giving the integration-style ESLint config regression test a 45s timeout. |

The act warnings are concentrated in existing interactive component tests. They did not fail the suite, but they are noisy enough to feed EvoLoop/DRL as a quality signal.

## EvoLoop/DRL Metric Envelope

Use these dashboard-ready fields for the next self-improvement ingestion pass:

| Metric | Value |
|---|---:|
| `ec_frontend_lighthouse_spot_performance_min` | 98 |
| `ec_frontend_lighthouse_spot_seo_min` | 100 |
| `ec_frontend_lighthouse_spot_accessibility_min` | 95 |
| `ec_frontend_lighthouse_spot_best_practices_min` | 96 |
| `ec_frontend_vitest_files_passed` | 227 |
| `ec_frontend_vitest_tests_passed` | 1089 |
| `ec_frontend_playwright_stable_passed` | 56 |
| `ec_frontend_playwright_stable_expected_skips` | 2 |
| `ec_frontend_vitest_act_warning_count` | 14 |
| `ec_frontend_sentrux_quality` | 6430 |
| `ec_frontend_sentrux_coupling` | 0.03 |
| `ec_frontend_sentrux_cycles` | 0 |
| `ec_frontend_sentrux_god_files` | 0 |

## Pair 6 Release Input

Pair 6 can proceed if the final release gates agree with this QA snapshot. The remaining release risks are backend-focused: Quality >7000, coverage >=85%, and `complex_fn <=4`. Frontend Performance and SEO carry-forwards are closed by the Pair 5 route matrix and this QA spot check.
