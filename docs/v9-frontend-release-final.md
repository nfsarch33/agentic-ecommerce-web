# EC v9.0.0 Frontend Release Final Evidence

**Status**: Pending final gate results  
**Date opened**: 2026-05-16  
**Target release**: `agentic-ecommerce-web` v9.0.0  
**Base**: v8.0.0

## Scope

v9.0.0 is the frontend platform-baseline release after v8.0.0. This metadata
slice:

- retargets the public release docs and version metadata to `v9.0.0`
- makes `primary-testing and secondary-testing` the mirrored self-hosted
  release gate for stable Playwright, full-stack E2E, cleanup, and UIAuto
  evidence
- keeps cloud deployment docs as reference-only material instead of blocking
  release gates
- removes stale legacy release labels, outdated framework wording, and
  local-path leakage from release-facing docs and harness text
- keeps `docs/v8-frontend-release-final.md` as historical evidence while
  reserving this document for the actual v9 release closeout

## Current Blocking Status

- Latest controller-side canaries: `wsl1-travel` PASS, `win1-travel` PASS,
  `wsl2-travel` PASS, `wsl2` FAIL (timeout), `win2` FAIL (timeout),
  `win2-travel` FAIL (timeout).
- `v9.0.0` remains RC-only until secondary-testing can satisfy the mirrored
  frontend and stack lanes as well as the controller SSH contract.
- Live-AI and external-provider remote vision runs remain operator-gated even
  after the mirrored self-hosted release gates close.

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
- `runx test-lane run --lane frontend-playwright-stable --pool secondary-testing`
- `runx test-lane run --lane full-stack-e2e --pool primary-testing`
- `runx test-lane run --lane full-stack-e2e --pool secondary-testing`
- `runx test-lane run --lane cleanup-testing --pool primary-testing`
- `runx test-lane run --lane cleanup-testing --pool secondary-testing`
- `runx test-lane run --lane frontend-uiauto-compare --pool primary-testing`
- `runx test-lane run --lane frontend-uiauto-compare --pool secondary-testing`

UIAuto evidence participates in the mirrored release gate and is no longer
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
- Deeper product-depth, performance, and post-release defect-harvest work roll
  forward into the `v10.0.0` program once the mirrored v9 release gate closes.
