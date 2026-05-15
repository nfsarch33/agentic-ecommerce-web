# EC v9.0.0 Frontend Release Final Evidence

**Status**: Pending final gate results  
**Date opened**: 2026-05-16  
**Target release**: `agentic-ecommerce-web` v9.0.0  
**Base**: v8.0.0

## Scope

v9.0.0 is the frontend platform-baseline release after v8.0.0. This metadata
slice:

- retargets the public release docs and version metadata to `v9.0.0`
- makes `primary-testing` the blocking self-hosted release gate for stable
  Playwright, full-stack E2E, cleanup, and UIAuto evidence
- keeps cloud deployment docs as reference-only material instead of blocking
  release gates
- removes stale legacy release labels, outdated framework wording, and
  local-path leakage from release-facing docs and harness text
- keeps `docs/v8-frontend-release-final.md` as historical evidence while
  reserving this document for the actual v9 release closeout

## Current Blocking Status

- Known-good travel-path probes from this session: `wsl1-travel`,
  `wsl2-travel`, and `win1-travel`.
- Direct follow-up probes for additional aliases were inconclusive because the
  tooling layer timed out before a clean classification was recorded.
- `v9.0.0` remains RC-only until `primary-testing` satisfies the frontend and
  stack lanes as well as the controller SSH contract.
- Live-AI and external-provider remote vision runs remain operator-gated even
  after the primary self-hosted release gate closes.

## Required Gates

Record final outcomes here before tagging:

- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test:coverage`
- `bun run build`
- `bun run test:e2e:stable`
- `bun run test src/release-metadata.test.ts`
- `runx test-lane run --lane frontend-playwright-stable --pool primary-testing`
- `runx test-lane run --lane full-stack-e2e --pool primary-testing`
- `runx test-lane run --lane cleanup-testing --pool primary-testing`
- `runx test-lane run --lane frontend-uiauto-compare --pool primary-testing`

UIAuto evidence participates in the primary release gate and is no longer
advisory for `v9.0.0`.

## Final Results

Pending. Fill in the final command outputs, artifact paths, frontend commit SHA,
controller/tester support-tool provenance, current pool status, and any
operator-approved skipped gates at release cut time.

## Carry-Forwards

- Only operator-gated live-AI and external remote-vision execution remain
  outside the blocking release path.
- Cloud deployment docs remain maintained as reference-only material for later
  cloud-native work.
- `docs/v10-frontend-release-checklist.md` and
  `docs/v10-frontend-release-final.md` now hold the post-v9 hardening and
  release follow-through contract.
- Deeper product-depth, performance, API/SSE happy-path hardening, and
  post-release defect-harvest work roll forward into the `v10.0.0` program
  once the primary v9 release gate closes.
