# EC v8 Pair 5 Frontend UX Media QA Research

> Date: 2026-05-12  
> Branch: `qa/v8-p05-frontend-ux-media`  
> Scope: frontend QA evidence for product image variant review UX, Playwright/uiauto comparison boundaries, Lighthouse/hydration drift, and remote OmniParser readiness.

## Evidence Reviewed

- Pair 5 MVP merge: frontend PR #69 at `a450a0f`.
- MVP docs:
  - `docs/operations/v8-p05-frontend-ux-media.md`
  - `reports/research/ec-v8-p05-frontend-ux-media-research.md`
- Existing frontend comparison docs:
  - `docs/uiauto-playwright-comparison.md`
  - `docs/v650-frontend-performance-seo.md`
  - `docs/v650-evomap-evoloop.md`
  - `test/uiauto/README.md`
  - `test/uiauto/CANDIDATES.md`
- Existing QA commands:
  - `bun run test:e2e:stable`
  - targeted `bunx playwright test e2e/admin-media.spec.ts --project=chromium --grep "product content page manages product media panel"`
  - backend fixtures-mode `runx env scrub -- make uiauto-compare`

## QA Decisions

1. Keep Playwright as the deterministic merge-blocking browser gate.
   - The new product content media review flow is already covered by a focused
     browser assertion and the stable Chromium suite.
2. Treat uiauto as advisory in Pair 5 QA.
   - Existing `test/uiauto/CANDIDATES.md` does not yet include `admin-media`.
   - The safe existing command is backend `make uiauto-compare` in default
     fixtures mode; runtime/live visual interpretation remains blocked until a
     remote OmniParser route is registered.
3. Do not run local VLM, OmniParser, or local LLM inference.
   - The MacBook crash/OOM lesson still applies.
   - Pair 5 QA records remote readiness and boundaries instead of promoting live
     vision execution.
4. Add a durable evidence contract test.
   - The test fails if the QA evidence doc omits Playwright, uiauto fixtures
     mode, Lighthouse/hydration, remote OmniParser, or closeout evidence.

## RED Target

- `src/lib/v8-p05-qa-evidence.test.ts` must fail until
  `docs/operations/v8-p05-frontend-ux-media-qa.md` exists and records the full
  QA matrix.

## Acceptance

- Focused evidence contract test passes.
- Focused component and Playwright tests still pass.
- Full frontend gates pass or any skipped gate is documented with a concrete
  environment reason.
- Sentrux has no structural degradation.
