# uiauto comparison candidates

This document tracks which Playwright specs are highest-value targets for
uiauto-framework comparison runs in v2.1.0. Priority is set by historical
flake density (from the v1.8 baseline triage and the v2.0.0 final
validation report) and by how much exposure each spec gets in the
release-gate matrix.

The five v2.1.0 prioritised scenarios live alongside this file in
[`scenarios/`](scenarios/) and map 1:1 to specs under [`../../e2e/`](../e2e):

| Scenario JSON | Playwright spec | Auth | Priority | Why |
|---|---|---|---|---|
| [`scenarios/home.json`](scenarios/home.json) | [`e2e/home.spec.ts`](../e2e/home.spec.ts) | none | low | Anchor on the storefront; uiauto smoke baseline. |
| [`scenarios/products.json`](scenarios/products.json) | [`e2e/products.spec.ts`](../e2e/products.spec.ts) | none | low | List-detail navigation, role-based selectors. |
| [`scenarios/checkout.json`](scenarios/checkout.json) | [`e2e/checkout.spec.ts`](../e2e/checkout.spec.ts) | none | high | The v2.0.0 NO-GO blocker `F4` was a `getByRole('heading', { name: 'Products' })` race after navigation; PR #42 anchored on the heading. uiauto self-healing should land the same anchor without code changes. |
| [`scenarios/admin-login.json`](scenarios/admin-login.json) | [`e2e/auth-admin.spec.ts`](../e2e/auth-admin.spec.ts) | viewer | medium | Exercises AuthProvider plugin end-to-end. |
| [`scenarios/admin-agents.json`](scenarios/admin-agents.json) | [`e2e/admin-agents.spec.ts`](../e2e/admin-agents.spec.ts) | operator | high | The agents dashboard has historically produced the largest selector churn in admin specs (status banner via `role=status`, dynamic dialogs, queued counters). |

## Flake categories targeted

Drawing on the v1.8/v2.0 baselines and the 2026-05-08 NO-GO report:

- **Heading-anchor races** (e.g. v2.0.0 `F4`/`F5`) -- specs that asserted on
  a heading immediately after a `goto` or click without `waitForURL` or a
  role-anchored wait. uiauto's `Light` tier should cache the resolved
  selector; if it drifts, the `Smart` tier re-discovers it via the LLM
  loop.
- **Dynamic role/aria-label churn** -- admin-agents click targets like
  `Show history for sourcing agent` and `Run sourcing agent now` are
  generated from agent data; aria-label format may shift between
  Playwright runs and uiauto runs. Self-heal events here are the most
  informative signal for v4 gate-vs-advisory.
- **Status banner timing** -- `getByRole('status')` is a live region; if
  the message lands and is replaced before the assertion fires, both
  runners flake. The comparison report should highlight whether uiauto's
  Smart tier waits longer or escalates to VLM.
- **Auth-cookie teardown leakage** -- `LoginForm.test.tsx` had a
  `localStorage.clear is not a function` regression in v2.0.0. uiauto runs
  use the AuthProvider plugin (no jsdom shimming), so any divergence here
  is environmental rather than fundamental.

## Out of scope for v2.1.0

The following specs are intentionally not modeled yet:

- `admin-ai-content.spec.ts`, `admin-compliance.spec.ts`, `admin-event-feed.spec.ts`,
  `admin-media.spec.ts`, `admin-sync.spec.ts`,
  `admin-tenant-compliance-reporting.spec.ts`, `admin-webhooks.spec.ts`,
  `admin-workflows.spec.ts`, `admin-agent-automation.spec.ts` -- planned
  for the v2.6.0 full comparison round (see plan `v260-qa`).
- `v100-release-flow.spec.ts`, `v200-release-flow.spec.ts` -- gated by the
  `E2E_RELEASE_FLOW=true` env. Add scenario JSONs in v2.6.0 only after
  uiauto's release-flow harness has been validated against a non-mock
  upstream.
- `helpers/auth.ts` is a Playwright-only helper; the Go-side AuthProvider
  plugin in [`plugins/auth_provider.go`](plugins/auth_provider.go)
  replicates its behaviour for uiauto runners.

## Update cadence

Refresh this list at the end of every QA sprint. Add a row when a new
spec ships; remove a row only after that spec has produced two successive
green uiauto comparison reports.
