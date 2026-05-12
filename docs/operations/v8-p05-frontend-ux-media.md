# EC v8 Pair 5 Frontend UX Media MVP

> Date: 2026-05-12  
> Branch: `feat/v8-p05-frontend-ux-media`  
> Scope: frontend MVP for product image variant review UX on the admin product content page.

## Summary

Pair 5 adds a compact operator review surface for generated product image
variants. The MVP stays inside the frontend media contract and does not add live
OpenAI, MiniMax, image-bridge, VLM, OmniParser, or backend-provider calls.

Image variants are represented by existing `MediaAsset` records tagged with
`image_edit_variant`. This keeps the UX compatible with the current media
library while Pair 6 decides the durable Temporal workflow and API shape for
image edit approvals.

## Implemented

- `ProductMediaPanel` now detects media assets tagged `image_edit_variant`.
- The product content page renders an accessible `Image edit variants` review
  region when variants exist.
- Each variant shows preview, title, alt text, and approval state.
- Operators can approve or reject a variant through an injectable
  `reviewImageVariantImpl` handler.
- The default handler updates local UI state only, so the current backend is not
  required to expose a new endpoint.
- The E2E mock API includes a generated lifestyle edit variant for the product
  content flow.

## TDD Evidence

RED:

```text
runx worktree run --repo agentic-ecommerce-web --branch feat/v8-p05-frontend-ux-media -- bun run test src/components/ProductMediaPanel.test.tsx

ProductMediaPanel > reviews generated image edit variants before publishing
Unable to find an accessible element with the role "region" and name `/image edit variants/i`
```

GREEN:

```text
runx worktree run --repo agentic-ecommerce-web --branch feat/v8-p05-frontend-ux-media -- bun run test src/components/ProductMediaPanel.test.tsx

Test Files  1 passed (1)
Tests  6 passed (6)
```

Browser smoke:

```text
runx worktree run --repo agentic-ecommerce-web --branch feat/v8-p05-frontend-ux-media -- bunx playwright test e2e/admin-media.spec.ts --project=chromium --grep "product content page manages product media panel"

1 passed
```

## Operational Boundaries

- No local heavy media work.
- No provider credentials or live provider calls.
- No OmniParser/VLM execution on the MacBook.
- The frontend review handler is injectable and defaults to local state until a
  backend/Temporal approval endpoint is promoted.
- Pair 5 QA owns Playwright plus uiauto comparison, Lighthouse, hydration drift,
  and remote OmniParser readiness evidence.

## Carry-Forwards

- Pair 5 QA: add uiauto comparison and route-level QA evidence.
- Pair 6: define durable Temporal approval workflow, signals/queries, and replay
  tests.
- Pair 8: wire media review decisions into broader media KPI and OOM/observability
  reporting if the metric contract is promoted.
