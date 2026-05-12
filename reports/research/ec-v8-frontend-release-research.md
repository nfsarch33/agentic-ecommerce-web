# EC v8 Frontend Release Metadata Research

> Date: 2026-05-13  
> Branch: `release/v8-frontend-metadata`  
> Scope: frontend v8.0.0 metadata, QA evidence, release checklist, and tag
> readiness.

## Sources Reviewed

- Frontend `main` at `180b2f9`, after v8 media UX PRs #69 and #70.
- Latest frontend release tag: `v7.5.1`.
- Backend v8.0.0 release published from `agentic-ecommerce` `caa4803`.
- Existing frontend metadata still points at `v7.5.1`.

## Decisions

1. Publish frontend `v8.0.0` as a metadata and QA release for the v8 media UX
   delta already merged after v7.5.1.
2. Add a release metadata guard test so stale package, README, changelog,
   checklist, and final evidence docs fail before tagging.
3. Do not add new frontend product behavior in this branch.
4. Keep uiauto/OmniParser comparison remote-resource gated; local QA may record
   a skip only when the remote runner is unavailable.
