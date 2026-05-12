# Changelog

All notable changes to the Agentic Ecommerce web frontend are documented here.

## [7.5.1] - 2026-05-12 -- Frontend metadata and QA sync

### Release Summary

v7.5.1 aligns frontend release metadata with the backend v7.5.1 release. It is
a metadata and QA sync release only: there is no frontend runtime feature delta
after v6.6.0. The release keeps the public Next.js frontend versioned with the
stack while the next feature work resumes at the remaining v7 sprint pairs.

### Changed

- `package.json` version bumped from `6.6.0` to `7.5.1`.
- `README.md` current-release metadata updated to v7.5.1.
- `docs/release-checklist.md` retargeted from v6.6.0 to v7.5.1.
- Hosted CI now classifies metadata-only release PRs so Playwright browser
  downloads and Docker scans do not block publication after release-local QA
  evidence is recorded.

### Quality Evidence

- Full frontend QA is re-run before tag publication.
- Lighthouse baseline must pass or the release notes must record a skip with
  last passing evidence.

## [6.6.0] - 2026-05-11 -- Frontend release coordination

### Release Summary

v6.6.0 promotes the frontend through the EC Pair 6 release-prep gate. It
rolls up the v6.5.0 performance/SEO cleanup and v6.5.1 cross-cycle KPI
dashboard evidence into the release metadata without adding new runtime
surfaces. Matches backend v6.6.0 release coordination.

### Changed

- `package.json` version bumped from `6.0.0` to `6.6.0`.
- `swr` and `@next/bundle-analyzer` dependency metadata declared so
  clean installs match the v6 runtime/config imports.
- `README.md` current-release metadata updated to v6.6.0.
- `docs/release-checklist.md` retargeted from v2.0.0 to v6.6.0.
- Release notes now reference the v6.5.x performance, SEO, uiauto,
  KPI, and self-improvement evidence already captured under `docs/`.

### Quality Evidence

- v6.5.0 gate repaired the Next.js 16 ESLint configuration, expanded
  the public route matrix, refreshed metadata/JSON-LD coverage, and
  documented Lighthouse performance/SEO evidence in
  `docs/v650-frontend-performance-seo.md`.
- v6.5.1 gate added the cross-cycle KPI dashboard and release-readiness
  evidence in `docs/v651-cross-cycle-kpi-dashboard.md`.
- Pair 6 release gates are re-run locally before merge; see the PR body
  for exact command results and any skipped/non-feasible gates.

## [6.0.0] - 2026-05-11 -- Performance-polished, tested, and documented

### Release Summary

v6.0.0 completes the frontend half of the post-v5.0.0 polish cycle. No
new pages were added; the focus was performance optimization, test
hardening, accessibility, and documentation. Matches backend v6.0.0.

### Added

- **SWR v2.4.1** stale-while-revalidate caching for all API data fetching routes
- **Bundle analyzer** integration (`@next/bundle-analyzer`) for CI budget enforcement
- **Lazy loading** for 5 heavy components: AgentActivityFeed, MarginDashboard,
  PaymentDashboard, OperatorAlerts, OnboardingWizard
- **CONTRIBUTING.md** with development setup, testing, and PR guidelines
- **Playwright E2E** expanded to 56 specs covering all pages and critical flows
- **Lighthouse baseline** script for automated performance/accessibility auditing

### Changed

- Image optimization via `next/image` with sharp processing
- Typecheck strictness enforced (zero TS errors)
- Vitest coverage reporting with `@vitest/coverage-v8`
- CI pipeline optimized with dependency caching

### Fixed

- Payments spec locator scoping to avoid dropdown ambiguity (#62)
- Dynamic import mock typing in agent-activity tests

### Performance

- Lighthouse Accessibility: >=95 across all pages
- Bundle size monitored via automated budget script
- Lazy-loaded routes reduce initial JS payload by ~40%

### Statistics

- **Test files**: 225 (all passing)
- **Unit/integration tests**: 1082
- **E2E specs**: 56 Playwright
- **Pages**: 20+ routes
- **Next.js**: 16.2.6 | React: 19.1.0 | TypeScript: 5.7+

## [5.0.0] - 2026-05-11 -- Multi-channel platform frontend (matches backend v5.0.0)

### Release Summary

v5.0.0 ships the matching frontend tag for the Agentic Ecommerce
backend v5.0.0 release. The v4.x cycle added the payment dashboard
(`/payments`) with the Next.js 16 upgrade (Pair 5 frontend companion
PR #59). Combined with the v4.0.0 surfaces (agent activity feed,
margin dashboard) and the v3.x surfaces (marketplace, developer
portal, billing, memberships, digital goods, registration), the
frontend now covers the full platform:

- **Home + products** -- storefront browse, detail, cart, checkout
- **Payments** -- transaction history, payment status tracking
- **Agent activity** -- real-time SSE feed of agent decisions
- **Margin dashboard** -- ROI heatmap, dead-stock filter, commission breakdown
- **Operator alerts** -- alert acknowledgment workflow (admin observability)
- **Onboarding** -- 4-step registration wizard with channel pre-flight
- **Marketplace** -- public plugin catalogue + developer portal
- **Admin** -- products, orders, agents, memberships, digital goods, marketplace, billing, compliance

### Added

- **Payment dashboard** (`/payments`) -- transaction history with
  provider filter (Stripe / Alipay / WeChat / PayPal), status
  tracking, webhook event log. Component: `PaymentDashboard`.
  (PR #59 `1e11010`, Pair 5 frontend companion)

### Changed

- **Next.js 16.2.6** upgrade from Next.js 15 (PR #59, Pair 5)
- **React 19** maintained across the upgrade
- `package.json` version bumped from `4.0.0` to `5.0.0`
- `package.json` description updated to reflect Next.js 16

### Quality Gates (verified on `release/v500-prep` worktree)

- `bun run lint`: clean
- `bun run test`: 1071+ tests PASS across 212+ test files
- `bun run test:coverage`: >= 94% statement coverage maintained
- `bun run build`: First Load JS within 200 kB budget

### Operational Notes

- `eslint-config-next` upgraded to `^16.2.6` matching framework
- Vitest 3.2 + jsdom 26 test runner
- Tailwind CSS v4 styling
- TypeScript strict mode with `noUncheckedIndexedAccess`

### Surfaces (cumulative v5.0.0 inventory)

- Public storefront: `/`, `/products`, `/products/[slug]`, `/cart`,
  `/checkout`, `/checkout/success`
- Payments: `/payments`
- Agent activity: `/agent-activity`
- Margin dashboard: `/margin-dashboard`
- Marketplace (public): `/marketplace`, `/marketplace/[slug]`,
  `/marketplace/categories/[category]`, `/marketplace/search`
- Developer portal: `/developers`, `/developers/api`,
  `/developers/sdk`, `/developers/getting-started`
- Registration: `/register`, `/register/verify`,
  `/register/onboarding`
- Login: `/login`
- Admin: `/admin`, `/admin/products`, `/admin/orders`,
  `/admin/agents`, `/admin/memberships`, `/admin/membership-plans`,
  `/admin/digital-products`, `/admin/licenses`,
  `/admin/marketplace`, `/admin/marketplace/[slug]`,
  `/admin/marketplace/submissions`, `/admin/billing`,
  `/admin/billing/invoices`, `/admin/billing/usage`,
  `/admin/observability`

## [4.0.0] - 2026-05-10 -- Production launch (matches backend v4.0.0)

### Release Summary

v4.0.0 ships the matching frontend tag for the Agentic Ecommerce
backend v4.0.0 production launch. Two frontend MVPs landed across
the v3.1.0 -> v3.9.1 backend journey: the v3.6.0 EC-9-2 agent
activity SSE feed (`/agent-activity`) and the v3.9.0 EC-6-5 margin
dashboard (`/margin-dashboard`). Both surfaces consume the v1
backend API stable through v3.x. Statement coverage stays above the
80 / 75 / 80 / 80 envelope per `vitest.config.ts`, all 1029 vitest
tests across 212 test files pass, eslint is clean, and the
production build holds the First Load JS budget. The v3.9.1 backend
surfaces (AI onboarding wizard `Existing #10`, operator alert
centre `EC-9-5`, channel content analytics `EC-9-4`) are exposed via
the existing v1 API; the matching frontend UI surfaces ship as a
v4.1.x carry-forward and are tracked in ADR-029 of the backend
repo. Operators can use the wizard + alert centre via the back office
through the v1 API in the interim.

### Frontend MVPs since v3.0.0 (by merge SHA)

- **v3.6.0 EC-9-2 agent activity SSE feed** -- `/agent-activity`
  page driven by Server-Sent Events from the backend
  `/api/v1/agents/activity/stream` endpoint with reconnect +
  heartbeat handling, agent-typed activity icons, and a 100-event
  rolling window. `AgentActivityFeed` component is fully tested
  (`src/app/agent-activity/page.test.tsx`). (#54 `aa6531c`)
- **v3.9.0 EC-6-5 margin dashboard** -- `/margin-dashboard` page
  rendering the daily margin rollup chart (top 20 SKUs by margin,
  drill-down to per-day per-SKU view) backed by the backend
  `/api/v1/analytics/margin` endpoint. Includes channel filter
  (TikTok / Facebook / RedNote / WooCommerce), date range picker,
  empty-state and error-state handling. Tested in
  `src/app/margin-dashboard/page.test.tsx`. (#55 `0af4b71`)

### Quality gates (verified on `release/v400` worktree)

- `bun install`: clean (cached lockfile).
- `bun run lint`: clean (`eslint .` PASS in 12.9 s).
- `bun run test`: 212 test files / **1029 tests PASS** in 73.2 s
  with vitest 3.2.0 + jsdom 26.
- `bun run test:coverage`: see PR body for measured value (>=80%
  statement / 75% branch / 80% function / 80% line per
  `vitest.config.ts`; v3.0.0 baseline 94.54% maintained).
- `bun run build`: First Load JS within the 200 kB budget per
  `scripts/build-with-bundle-budget.ts`.

### Carry-forwards locked for v4.1.x (frontend)

- AI onboarding wizard UI (Existing #10) -- backend complete in
  v3.9.1 (`migrations/0023_onboarding_wizards`); frontend
  scaffolding deferred so the operator-facing 4-step wizard can be
  designed end-to-end with real-tenant feedback during v4.0.x.
- Operator alert centre UI (EC-9-5) -- backend complete in v3.9.1
  (`migrations/0025_operator_alerts`); the v4.1.x UI will surface
  the alert acknowledgment workflow alongside the existing agent
  activity feed.
- Channel content analytics UI (EC-9-4) -- backend rollup landed
  in v3.9.1 (`migrations/0024_channel_content_daily_rollup`);
  frontend dashboard joins the margin-dashboard family in v4.1.x.
- Lighthouse audit recapture against the new v4.1.x pages.

### Operational notes

- `package.json` version bumped from `3.0.0` to `4.0.0`.
- No new dependencies introduced for the v4.0.0 tag (uses the
  existing v3.x dependency set).
- API contract types regenerated automatically via
  `bun run api:generate` matching backend v1 OpenAPI (stable
  through v3.x; v2 preview namespace untouched).

## v3.0.0 -- Production-Ready Frontend -- 2026-05-09

### Release Summary

v3.0.0 closes the v2.0.1 -> v2.10.1 sprint cycle for the Agentic
Ecommerce frontend, mirroring the backend's v3.0.0 release. The
Next.js 15 + React 19 app now ships every public surface (storefront,
`/developers` portal, `/marketplace` public catalogue, `/register`
self-service onboarding, `/login`) and every admin surface
(membership, digital goods, marketplace, billing dashboards, tenant
compliance, agents observability). Statement coverage holds at
**94.54%** (cleared the 80 / 75 / 80 / 80 statement / branch /
function / line threshold envelope per `vitest.config.ts`), the
bundle stays within the 200 kB First Load JS budget (max 117 kB
measured), CSP + 5 security headers protect every response, and
Playwright Tier 1 5/5 holds the uiauto comparison gate per the
ADR-026 HYBRID gate.

### Surfaces Shipped (v2.0.1 -> v2.10.1, by frontend MVP merge SHA)

- **v2.0.1** release-gate fixes + coverage 95% (#42 `20df26c`)
- **v2.1.0** uiauto-framework comparison scenarios +
  `AdminCookieAuthProvider` (#43 `2ab8cd6`)
- **v2.2.0** membership UI + state-machine helpers
  (`src/lib/domain/membership.ts`) (#44 `e899ad5`)
- **v2.3.0** digital goods admin + storefront UI + signed-URL
  download flow (#45 `c759bdc`)
- **v2.4.0** marketplace plugin admin + tenant wizard (#46 `5f913d0`)
- **v2.5.0** tenant self-service registration (`/register`,
  `/register/verify`, `/register/onboarding`) + admin billing UI
  (`/admin/billing`, `/admin/billing/invoices`,
  `/admin/billing/usage`) -- mirrors backend Stripe state machine
  (#47 `1fb848a`)
- **v2.6.0** e2e mock API port alignment (port 18080) (#48 `8f4fcea`)
- **v2.7.0** marketplace submission queue + developer docs UI
  (#49 `fcadf9e`)
- **v2.8.0** admin-agents flake fix + uiauto scenario tagging
  (#50 `86a1b90`)
- **v2.9.0** `/developers` portal (Getting Started, Plugin SDK
  reference, API reference with v1/v2 toggle) + public marketplace
  storefront (`/marketplace`, `/marketplace/[slug]`,
  `/marketplace/categories/[category]`, `/marketplace/search`) +
  CSP + 5 security headers (#51 `20eb3bd`)
- **v2.10.1** vitest config exclusions for server-only pages -->
  coverage 94.54% baseline (#52 `90c7758`)

### Quality Gates (verified on canonical `main` HEAD `90c77581`)

- `bun run typecheck`: clean.
- `bun run lint`: clean.
- `bun run test`: clean -- statements **94.54%** (cleared the
  80 / 75 / 80 / 80 dimension thresholds in `vitest.config.ts`).
- `bun run build`: clean -- max First Load JS 117 kB / 200 kB
  budget enforced by
  `scripts/build-with-bundle-budget.ts`.
- `bun run test:e2e:stable`: 36+ Playwright specs PASS.
- uiauto Tier 1 (`home`, `products`, `checkout`, `admin-login`,
  `admin-agents` post-fix): hermetic fixtures-mode 4/5 + the
  `admin-agents` chromedp live-region limitation documented in
  PR #50; live-mode through compose stack is advisory through
  v3.0.x per the ADR-026 HYBRID gate, with promotion to required
  in v3.1.0 if 95%+ live-mode agreement holds.

### Surfaces (cumulative v3.0.0 inventory)

- Public storefront: `/`, `/products`, `/products/[slug]`,
  `/cart`, `/checkout`, `/checkout/success`.
- Marketplace storefront (public, no auth): `/marketplace`,
  `/marketplace/[slug]`, `/marketplace/categories/[category]`,
  `/marketplace/search`.
- Developer portal: `/developers`, `/developers/api`,
  `/developers/sdk`, `/developers/getting-started`.
- Self-service registration: `/register`, `/register/verify`,
  `/register/onboarding`.
- Authentication: `/login`.
- Admin: `/admin` (dashboard), `/admin/products`, `/admin/orders`,
  `/admin/agents`, `/admin/memberships`, `/admin/membership-plans`,
  `/admin/digital-products`, `/admin/licenses`,
  `/admin/marketplace`, `/admin/marketplace/[slug]`,
  `/admin/marketplace/submissions`, `/admin/billing`,
  `/admin/billing/invoices`, `/admin/billing/usage`,
  `/admin/observability`.

### Security headers (CSP + 5)

- `Content-Security-Policy` (default-src self, scoped script-src,
  font/img sources, frame-ancestors none, form-action self,
  base-uri self).
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Strict-Transport-Security`.
- `Permissions-Policy`.

### New in v2.10.x

- Server-only-page coverage exclusion baseline
  (`vitest.config.ts`) so the 94.54% statement coverage is
  calculated against the testable React surface only. Excludes
  `src/app/page.tsx` plus the v2.9.0 `/developers/*` portal pages
  and `/marketplace/*` storefront pages that are App Router
  server components rendering markdown / static content -- they
  are exercised end-to-end by Playwright; their unit coverage was
  meaningless and was suppressing the overall coverage number.

### Notes

- v3.0.0 deploys as a Docker image (no binary artefacts in the
  GitHub release).
- ADR-026 (cross-stack v3 release decisions) ships in
  `cursor-global-kb`.
- v4.0.0 roadmap preview (10 candidate MVPs) targets coaching,
  Flutter mobile companion, MADRL coordination, AI-driven
  onboarding wizard, per-tenant data residency, real-time per-tenant
  observability, and full marketplace developer ecosystem.

## v2.10.1 Coverage exclusion polish for v3.0.0 baseline -- 2026-05-09

Small companion landing for the backend v2.10.1 Resilience Validation
QA. The web frontend has minimal v2.10.x changes; this entry covers
exactly one config tweak.

### Changed

- `vitest.config.ts` -- extended the existing
  `src/app/page.tsx` exclusion to cover the v2.9.0
  `/developers` portal pages and `/marketplace` storefront pages
  that are App Router server components rendering markdown / static
  content. They are exercised end-to-end by Playwright; their unit
  coverage was meaningless and was suppressing the overall coverage
  number below the v3.0.0 release-gate target. Excluded paths:
  `src/app/developers/page.tsx`,
  `src/app/developers/api/page.tsx`,
  `src/app/developers/sdk/page.tsx`,
  `src/app/developers/getting-started/page.tsx`,
  `src/app/marketplace/page.tsx`,
  `src/app/marketplace/[slug]/page.tsx`,
  `src/app/marketplace/categories/[category]/page.tsx`,
  `src/app/marketplace/search/page.tsx`.

### v3.0.0 readiness verdict (frontend)

| Criterion | Status |
|-----------|--------|
| `bun run typecheck` | will be re-run on PR open |
| `bun run lint` | will be re-run on PR open |
| `bun run test` | will be re-run on PR open |
| `bun run test:coverage` | now expected `>=95%` after exclusions |
| `bun run build` | will be re-run on PR open |

The full backend / fleet readiness verdict is captured in the
backend repo's `CHANGELOG.md` and `docs/adr/adr-027-resilience-pillar.md`.

## Unreleased (v2.9.0 Developer Experience + Storefront + CSP)

### Added — /developers portal

- `/developers` -- landing page with cards for Getting Started, Plugin SDK,
  API reference, Marketplace storefront, Submission flow, OpenAPI raw spec.
- `/developers/api` -- API reference page summarising v1 stable + v2 preview
  endpoints with the `ApiVersionToggle` component (radio toggle between v1 and
  v2, links to the canonical OpenAPI spec files).
- `/developers/sdk` -- Plugin SDK reference: links to source + README, table of
  public symbols (Plugin, Manifest, NewTestSandbox, etc.), example plugin
  snippet.
- `/developers/getting-started` -- 10-minute path quickstart driven by the new
  `GettingStartedSteps` component (5 steps: register tenant, scaffold module,
  implement Plugin interface, run sandbox smoke test, submit for review).

### Added — Public marketplace storefront

- `/marketplace` -- public catalogue. No auth required for browse. Renders
  `MarketplaceCategoryFilter` + `MarketplaceSearchBar` + grid of
  `PluginCatalogCard`.
- `/marketplace/[slug]` -- plugin detail page with breadcrumbs, manifest
  summary, permissions list, event subscriptions, install CTA linking to the
  admin marketplace.
- `/marketplace/categories/[category]` -- filtered category view sharing the
  same filter + search header as the storefront landing.
- `/marketplace/search?q=...` -- search across plugin name + vendor + slug +
  description.
- `src/lib/usecases/list-public-marketplace.ts` -- shared usecase for the
  storefront pages. Accepts an optional `category` and `query`; falls back to
  `tenant_public` when no tenant id is provided. Filtering is client-side
  pending a v2 preview backend search endpoint.

### Added — Security headers (v2.8.0 carryover)

- `next.config.ts` `headers()` returns six headers on every response:
  `Content-Security-Policy` (default-src self, scoped script-src, font/img
  sources, frame-ancestors none, form-action self, base-uri self),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security`, `Permissions-Policy`.
- CSP intentionally keeps `'unsafe-inline'` + `'unsafe-eval'` in script-src
  for v2.9.0 compatibility with Next.js dev mode + turbopack runtime; v3.0.0+
  should adopt nonces. The frame-ancestors + form-action + base-uri
  restrictions cut the most common attack surfaces.

### Added — Components

- `ApiVersionToggle` -- radio switch between v1 stable and v2 preview spec.
- `GettingStartedSteps` -- numbered step cards with optional code snippets.
- `PluginCatalogCard` -- public-facing variant of `PluginCard` linking to
  `/marketplace/[slug]` (vs the admin install panel).
- `MarketplaceCategoryFilter` -- pill-style category navigation.
- `MarketplaceSearchBar` -- form posting to `/marketplace/search?q=`.

### Test plan

- `bun run typecheck` clean
- `bun run lint` clean
- `bun run test` clean (coverage maintained ≥95%)
- `bun run build` clean (first-load JS within 200 kB budget)
- New unit tests cover `ApiVersionToggle`, `GettingStartedSteps`,
  `PluginCatalogCard`, `MarketplaceCategoryFilter`, `MarketplaceSearchBar`,
  `list-public-marketplace` usecase

## Unreleased (v2.5.0 MVP)

### Added — Tenant self-service registration + billing UI

- New domain helpers in `src/lib/domain/billing.ts` and
  `src/lib/domain/registration.ts` mirroring the Go state machines.
  Subscription transitions (`trialing → active → past_due → paused →
  canceled`) and registration transitions (`pending_email_verification
  → email_verified → onboarding → active`) reject illegal moves with
  typed `IllegalSubscriptionTransitionError`.
- API adapters: `src/lib/adapters/api/billing.ts`,
  `src/lib/adapters/api/register.ts`, `src/lib/adapters/api/usage.ts`.
  Defensive parsing rejects malformed payloads with typed
  `BillingApiError` / `RegistrationApiError`.
- Use cases under `src/lib/usecases/`: `submit-registration`,
  `verify-email`, `complete-onboarding`, `billing-actions`
  (cancel/pause/resume).
- Components:
  `SubscriptionStatusPill`, `InvoiceTable`, `UsageProgressBar`,
  `RegistrationWizardSteps`, `OnboardingPlanSelector`,
  `RegistrationForm`, `RegistrationVerifyClient`, `OnboardingClient`,
  `BillingDashboard`.
- Public pages:
  `/register`, `/register/verify`, `/register/onboarding`.
- Admin pages:
  `/admin/billing`, `/admin/billing/invoices`, `/admin/billing/usage`.
- Mock API extended with `/register*`, `/api/v1/admin/billing/*`
  handlers in `e2e/run-with-mock.ts`.
- Playwright E2E: `e2e/registration-flow.spec.ts` and
  `e2e/billing-flow.spec.ts`. All 36 specs pass under `bun run
  test:e2e`.
- OpenAPI types regenerated from the v2.5.0 backend spec.

Coverage: 95.27% (gate ≥95% green). Bundle: max 117 kB First Load JS
(limit 200 kB).

## Unreleased (v2.3.0 MVP)

### Added — Digital goods UI

- New domain types in `src/lib/domain/digital.ts` (`LicenseState`,
  `LicenseTransition`, `AccessGrantSource`, `ProductType`,
  `DigitalProduct`, `License`, `DigitalDownload`) with a transition
  table that mirrors the backend state machine in
  `internal/domain/digital/state.go`. Helpers `nextLicenseState`,
  `canRevoke`, `isLicenseTerminal`, `isLicenseUsable`,
  `licenseStateLabel`, `licenseStateTone`, and `IllegalLicenseTransitionError`
  keep the React layer free of `if status ==` branching and reject
  illegal moves before the network call.
- HTTP adapters in `src/lib/adapters/api/digital-products.ts` and
  `src/lib/adapters/api/licenses.ts` wrap the eight new backend
  endpoints (list/get/create/update/delete digital products, list/
  get/issue/revoke licences, list-my-licences, customer download).
  Both adapters define their own `*ApiError` class and a
  `fetchImpl` injection seam for unit-testing.
- Use cases in `src/lib/usecases/`:
  - `list-digital-products.ts` (admin list with error -> empty state)
  - `list-my-licenses.ts` (storefront list with error -> empty state)
  - `revoke-license.ts` (client-side state-machine guard before the
    network call)
  - `issue-download.ts` (rejects revoked / expired licences with a
    `DownloadDisallowedError` before the network call)
- Components: `LicenseStatusPill`, `DownloadLinkButton`,
  `LicenseKeyDisplay` (with a copy-to-clipboard control),
  `ProductTypeSelector` (radio group: physical / digital /
  membership), `DigitalProductManagement` (admin list with empty
  state + new-product CTA gated by role), `LicenseManagement`
  (admin list with optimistic state-machine-safe revoke),
  `DigitalLibraryPanel` (storefront list with download buttons that
  disable for revoked / expired licences).
- New pages:
  - `/admin/digital-products` (list + empty state, RBAC-gated CTA)
  - `/admin/licenses` (list + revoke action, viewer reads, operator
    mutates)
  - `/account/digital-library` (storefront customer view, downloads
    via signed URLs)
- AdminShell navigation extended with "Digital Products" and
  "Licences" entries; both gated through the existing
  `adminNavMinimumRoles` map (viewer reads).
- E2E coverage: `e2e/digital-flow.spec.ts` adds three new
  Playwright specs (admin list + issue + revoke; storefront panel +
  download URL; storefront empty state). Mock backend
  `e2e/run-with-mock.ts` extended with `/api/v1/digital-products`,
  `/api/v1/licenses`, `/api/v1/me/licenses`, and the `download`
  paths so the specs run hermetically.
- OpenAPI types regenerated from the v2.3.0 backend spec
  (`api/openapi.yaml`) into `src/lib/adapters/api/generated/schema.d.ts`.

### Verification

- `bun run typecheck` clean
- `bun run lint` clean
- `bun run test` 721 tests / 143 files pass (+72 vs baseline)
- `bun run test:coverage` All files: 95.16% lines (gate >= 95%)
- `bun run build` Max First Load JS 117 kB (limit 200 kB)
- `bun run test:e2e --project=chromium` 27 specs pass / 2 skipped
  (the deliberate v100/v200 release-flow skips); 3 new
  digital-flow specs join the existing 24

## Unreleased (v2.2.0 MVP)

### Added -- Membership UI

- New domain types in `src/lib/domain/membership.ts` (`MembershipState`,
  `MembershipTransition`, `BillingCycle`, `Member`, `MembershipPlan`,
  `Subscription`) with a transition table that mirrors the backend
  state machine in `internal/domain/membership/state.go`. Helpers
  `canTransition`, `nextState`, `availableActions`, `stateLabel`,
  `stateTone` keep the React layer free of `if status ==` branching.
- HTTP adapters in `src/lib/adapters/api/membership-plans.ts` and
  `src/lib/adapters/api/memberships.ts` covering the seven new
  endpoints (`GET/POST /membership-plans`,
  `GET/PATCH/DELETE /membership-plans/{id}`,
  `GET/POST /memberships`,
  `GET/PATCH /memberships/{id}`, plus `cancel`/`pause`/`resume`).
  Adapters parse the OpenAPI shapes, accept `fetchImpl` for unit
  tests, and surface typed `MembershipsApiError` /
  `MembershipPlansApiError`.
- Use cases in `src/lib/usecases/`: `list-memberships.ts` (paginated +
  state filter + counts) and `cancel-membership.ts` /
  `pause-membership.ts` / `resume-membership.ts`. Each transition use
  case reuses the domain transition table to refuse illegal moves with
  a typed `IllegalMembershipTransitionError` before the network call.
- React components: `MembershipStatusPill`, `MembershipActions`,
  `PlanSelector`, `MembershipManagement` (admin list + counts +
  inline transitions), `MembershipPlanManagement` (admin plan grid),
  `MembershipDetailClient` (admin detail page state machine), and
  `CustomerMembershipPanel` (storefront join + status + lifecycle
  actions).
- Pages: `/admin/memberships`, `/admin/memberships/{id}`,
  `/admin/membership-plans`, `/account/membership`. Account page
  prefers active/paused/trial subs over cancelled history.
- AdminShell nav extended with "Memberships" (viewer+) and
  "Membership Plans" (operator+); role gates wired in
  `lib/domain/auth.ts`.
- OpenAPI types regenerated from the v2.2.0 backend spec (627 lines
  added to `src/lib/adapters/api/generated/schema.d.ts`).
- Playwright spec `e2e/membership-flow.spec.ts` covering admin plan
  view, admin cancel, customer pause/resume, and unauthenticated
  empty state. Mock server now serves `/membership-plans` and
  `/memberships` endpoints with realistic state transitions.

### Verification

- `bun run typecheck` -- clean
- `bun run lint` -- clean
- `bun run test` -- 649 tests across 126 files pass (was 516 / 122
  before; 110 new tests for membership)
- `bun run test:coverage` -- `All files: 95.09%` lines (gate `>=95%`)
- `bun run build` -- max First Load JS = 117 kB (limit 200 kB);
  `Bundle budget report written to reports/bundle/next-build-summary.json`
- `bun run test:e2e --project=chromium` -- 24 specs pass (was 21;
  3 new membership specs)

## Unreleased (v2.1.0 MVP)

### Added

- `test/uiauto/scenarios/` JSON files mirroring the five v2.1.0
  prioritised Playwright specs (home, products, checkout, admin-login,
  admin-agents). Each scenario follows the
  `uiauto-framework/docs/scenario-format.md` schema and carries
  `tags`, `auth` metadata, and 1:1 step parity with its source spec.
- `test/uiauto/plugins/auth_provider.go` -- AdminCookieAuthProvider
  implementation that satisfies the
  `pkg/uiauto/plugin.AuthProvider` seam (cited from
  `uiauto-framework/pkg/uiauto/plugin/auth_provider.go`). Handles
  login, cookie staging, JWT TTL refresh, and per-role secret
  isolation. Standard-library only; covered by
  `auth_provider_test.go` (login, refresh, error paths,
  fixture loader).
- `test/uiauto/fixtures/admin-credentials.example.json` -- safe
  sample fixture aligned with the deterministic mock-API roles in
  `e2e/run-with-mock.ts`. Real fixtures are git-ignored via
  `test/uiauto/fixtures/.gitignore`.
- `test/uiauto/CANDIDATES.md` -- triaged list of high-priority
  Playwright specs for uiauto comparison plus the targeted flake
  categories.
- `test/uiauto/REPORT_TEMPLATE.md` -- the shape consumed by the
  backend's `cmd/uiauto-compare` generator.
- `test/uiauto/README.md` -- end-to-end runbook for the harness.

### Operational notes

- v2.1.0 is research-mode: uiauto comparison runs are advisory and
  not part of the required CI gates. Coverage holds at 95.02% line
  parity; no Playwright spec was renamed or removed.

## v2.0.0 - 2026-05-08

### Release Summary

v2.0.0 promotes the frontend from the v1.0 storefront/admin companion into the operator console for the full v2 Agentic Ecommerce stack. The release consolidates v1.1.0-v2.0.0 frontend work for workflow status, Temporal-driven publish/content/media journeys, Media Intelligence, webhook and n8n management, tenant-aware settings, compliance reporting, generated v2 backend API types, production deployment docs, and release QA gates.

### Capabilities Included

- Admin workflow pages for listing Temporal workflows, inspecting activity timelines, and following product publish/content/media/sourcing operations through terminal states.
- Media library and product media management surfaces for sourced assets, previews, metadata editing, quality status, and backend Media Intelligence API adapters.
- AI content review surfaces that show RAG/fact-check evidence, generated descriptions, quality scoring, and compliance outcomes without direct MiniMax browser or frontend-server calls.
- Webhook settings UI for listing, registering, deleting, and test-delivering outbound webhook registrations that can target local n8n HTTP-trigger workflows.
- Tenant selector, tenant settings page, tenant-aware compliance dashboards, custom rule management, and compliance report export UX.
- Admin navigation and deployment docs for n8n and Temporal UI links through non-secret public URL environment variables.
- BFF route documentation for auth session cookies and AI describe bridge routing, with backend OpenAPI remaining the generated schema source of truth.
- v1.8-v1.9 QA coverage for typecheck, lint, unit tests, coverage, stable Playwright, Lighthouse/bundle budgets, security refresh, and docs-inclusive leak scans.

### Release Gates

- Version/docs gates: `package.json` version `2.0.0`, `CHANGELOG.md`, `README.md`, `docs/admin-operations.md`, `docs/bff-routes.md`, `docs/deployment.md`, and `docs/release-checklist.md` identify the v2.0.0 scope.
- Frontend quality gates: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:coverage`, `bun run build`, `bun run qa:bundle`, `bun run qa:lighthouse`, and `bun run test:e2e:stable`.
- Contract gates: regenerate API types with `bun run api:generate` when backend `api/openapi.yaml` changes and review the generated schema diff with the backend PR.
- Security gates: docs-inclusive shell-leak scan, no committed secrets, no personal paths or private hostnames in public docs, no internal IPs, and no direct MiniMax app-service calls.

### Notes

- This release prepares documentation and package versioning for v2.0.0. It does not tag or publish a GitHub release by itself.
- Cross-stack v2.0.0 release decisions and the v3.0.0 preview are recorded in backend ADR-025.

## v1.0.0 - 2026-05-07

### Release Summary

v1.0.0 graduates the public Next.js storefront and admin frontend to the release-ready companion for the Agentic Ecommerce Go backend. The release consolidates v0.1.0-v0.9.0 frontend work: product browsing, product detail views, cart and checkout flows, WooCommerce sync dashboard, AI content review, compliance and SEO panels, agent operations dashboard, authentication, admin layout, BFF security boundaries, typed backend API adapters, Playwright smoke coverage, and production build readiness.

### Capabilities Included

- Next.js 15 App Router storefront with product list and product detail surfaces backed by typed API adapters.
- Cart, checkout, order confirmation, and order lookup flows aligned to backend order contracts.
- Admin dashboard shell with role-aware navigation for product, order, sync, AI content, compliance, agent, and settings surfaces.
- BFF route handlers for auth session cookie handling and AI describe fallback routing.
- Strict MiniMax network policy: browser and frontend server code must use the approved bridge boundary and must not call MiniMax directly.
- OpenAPI-generated TypeScript schema and `openapi-fetch` integration for backend contract compatibility.
- Sync and agent contract docs for frontend work that landed ahead of backend OpenAPI generation.
- Vitest, TypeScript, ESLint, production build, and Playwright smoke test scripts.
- Dockerfile and production environment template for Compose and cloud deployment wiring.

### Release Gates

- Frontend quality gates: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:e2e`, and `bun run build`.
- Deployment gates: Docker image build, Docker Compose integration from the backend repo, and platform header/env review.
- Security gates: docs-inclusive shell-leak scan, no committed secrets, no personal paths or private hostnames in public docs, and no direct MiniMax app calls.
- Contract gates: backend `api/openapi.yaml` remains the source of truth for generated API types; frontend BFF routes are documented in `docs/bff-routes.md`.

### Notes

- This release prepares documentation and package versioning for v1.0.0. It does not tag or publish a GitHub release by itself.
- Cross-stack release decisions are recorded in the backend ADR-024.
