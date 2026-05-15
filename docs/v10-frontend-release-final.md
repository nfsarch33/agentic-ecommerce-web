# EC v10.0.0 Frontend Release Final Evidence

**Status**: Pending post-v9 hardening results
**Date opened**: 2026-05-16
**Target release**: `agentic-ecommerce-web` v10.0.0
**Base**: v9.0.0

## Scope

v10.0.0 is the frontend hardening release after `v9.0.0`. This evidence slice:

- carries forward the `primary-testing`-only release model
- makes generated API types and adapter-only consumption a release contract
- treats stable backend HTTP/SSE flows as the source of truth for agent
  activity, agent status, sync events, marketplace/media/admin flows, and AI
  suggestion paths
- requires polling and `bff_fallback` to stop being the release-critical happy
  path
- preserves Flutter code delivery and cloud-native execution as deferred work
  outside the active release scope

## Current Blocking Status

- `v9.0.0` must publish before `v10.0.0` tagging work can begin.
- Known-good travel-path probes from this session cover the primary Linux,
  secondary Linux, and primary Windows travel aliases.
- Direct follow-up probes for additional aliases were inconclusive because the
  tooling layer timed out before a clean classification was recorded.
- `v10.0.0` remains blocked until the frontend can consume stable backend
  contracts without depending on polling or fallback-only behavior.

## Required Gates

Record final outcomes here before tagging:

- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test:coverage`
- `bun run build`
- `bun run qa:bundle`
- `bun run test:e2e:stable`
- `bun run test src/release-metadata.test.ts`
- `runx test-lane run --lane frontend-playwright-stable --pool primary-testing`
- `runx test-lane run --lane full-stack-e2e --pool primary-testing`
- `runx test-lane run --lane cleanup-testing --pool primary-testing`
- `runx test-lane run --lane frontend-uiauto-compare --pool primary-testing`

## Interface Readiness Requirements

- Generated API types match the backend contract intended for `v10.0.0`.
- SSE-backed flows are stable for agent activity and sync/event paths.
- Polling and `bff_fallback` are no longer required for the happy path.
- Future Flutter work can consume the same backend contract without a parallel
  frontend-specific backend.

## Final Results

Pending. Fill in final command outputs, artifact paths, frontend commit SHA,
primary-lane status, and any operator-approved skipped gates at release cut
time.

## Carry-Forwards

- Cloud-native execution remains deferred.
- Flutter code delivery remains deferred until the shared backend contract is
  stable.
- Any release-local exceptions must be documented here before tagging.
