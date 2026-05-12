# EC v8 Pair 5 Frontend UX Media Research

> Date: 2026-05-12  
> Branch: `feat/v8-p05-frontend-ux-media`  
> Scope: frontend MVP for product image variant review UX. Backend behavior stays inside the v8 Pair 4 image edit contract; no local VLM, OmniParser, or live image provider calls.

## Evidence Reviewed

- Pair 4 backend contract:
  - `agentic-ecommerce:internal/media/image_edit.go`
  - `agentic-ecommerce:docs/operations/v8-p04-image-editing.md`
  - `agentic-ecommerce:docs/operations/v8-p04-image-editing-qa.md`
  - states: requested, pending approval, approved, rejected
  - large-asset local decode guard: `MaxLocalDecodeBytes`
  - EvoMap-ready media KPI output via `ImageEditMediaKPISample`
- Existing frontend media UX:
  - `src/components/ProductMediaPanel.tsx`
  - `src/components/ProductMediaPanel.test.tsx`
  - `src/components/MediaLibrary.tsx`
  - `src/components/MediaLibrary.test.tsx`
  - `src/app/admin/products/[id]/content/page.tsx`
  - `e2e/admin-media.spec.ts`
- Existing frontend media domain/API:
  - `src/lib/domain/media.ts`
  - `src/lib/adapters/api/media.ts`
  - `src/lib/usecases/media-library.ts`
- E2E mock server:
  - `e2e/run-with-mock.ts`

## Decisions

1. Extend `ProductMediaPanel` first.
   - It is already embedded on the product content admin page beside AI copy
     review, which is where an operator naturally reviews image variants before
     publishing.
2. Keep the MVP frontend-only and fake-safe.
   - Use existing `MediaAsset` data tagged as `image_edit_variant` to render
     review candidates.
   - Add an injectable review handler for tests and future API wiring.
   - Default review behavior remains local UI state only, so no missing backend
     endpoint can break the product content page.
3. Preserve the existing media API surface.
   - No OpenAPI/schema regeneration is required in this MVP.
   - No live provider, image bridge, VLM, or OmniParser calls are introduced.
4. Use product-operator controls, not a marketing layout.
   - The review UX should be compact, scannable, and action-oriented.
   - Buttons should expose explicit approve/reject decisions and stable
     accessible names for Playwright/uiauto.

## RED Targets

1. `ProductMediaPanel` component test:
   - renders an image edit variant review section from a tagged media asset,
   - shows pending approval state,
   - approves a variant through an injected handler,
   - updates the visible decision state.
2. Product content Playwright test:
   - sees the image edit variants region on the admin product content page,
   - approves the lifestyle edit variant,
   - observes the approved state without any provider call.

## Acceptance

- Focused component RED fails before implementation.
- Focused component GREEN passes after minimal implementation.
- Focused Playwright RED/GREEN is captured or the local E2E environment blocker
  is recorded with a concrete reason.
- Full Pair 5 MVP gates run before merge: typecheck, lint, unit tests, build,
  docs check, shell-leak scan, and available frontend E2E smoke.
