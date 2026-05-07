# Changelog

All notable changes to the Agentic Ecommerce web frontend are documented here.

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
