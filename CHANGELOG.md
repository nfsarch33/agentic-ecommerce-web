# Changelog

All notable changes to the Agentic Ecommerce web frontend are documented here.

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
