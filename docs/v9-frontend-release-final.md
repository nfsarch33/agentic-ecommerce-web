# EC v9.0.0 Frontend Release Final Evidence

**Status**: Pending final gate results  
**Date opened**: 2026-05-14  
**Target release**: `agentic-ecommerce-web` v9.0.0  
**Base**: v8.0.0

## Scope

v9.0.0 is the frontend platform-baseline release after v8.0.0. This metadata
slice:

- retargets the public release docs and version metadata to `v9.0.0`
- removes stale legacy release labels, outdated framework wording, and
  local-path leakage from release-facing docs and harness text
- keeps `docs/v8-frontend-release-final.md` as historical evidence while
  reserving this document for the actual v9 release closeout

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
- `runx test-lane run --lane cleanup-testing --pool primary-testing`
- staging smoke and rollback evidence from the approved primary-testing lane

## Final Results

Pending. Fill in the final command outputs, artifact paths, frontend commit SHA,
controller/tester support-tool provenance, and any operator-approved skipped
gates at release cut time.

## Carry-Forwards

- UIAuto and live-AI evidence remain advisory until the testing-pool program
  promotes them to release-gating status.
- `secondary-testing` remains non-blocking standby capacity until its SSH,
  cleanup, and resource-health gates are green from the controller.
- GKE staging must be green before tagging `v9.0.0`.
