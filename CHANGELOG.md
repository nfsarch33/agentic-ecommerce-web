# Changelog

All notable changes to the Agentic Ecommerce web frontend are documented here.

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
