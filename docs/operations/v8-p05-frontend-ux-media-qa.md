# EC v8 Pair 5 Frontend UX Media QA

> Date: 2026-05-12  
> Branch: `qa/v8-p05-frontend-ux-media`  
> Scope: frontend QA for product image variant review UX, browser stability, uiauto comparison boundaries, Lighthouse, hydration drift, and remote OmniParser readiness.

## Summary

Pair 5 QA validates the frontend image variant review UX shipped in PR #69.
The review UX stays deterministic and provider-free: no OpenAI, MiniMax,
image-bridge, VLM, or OmniParser workload was run locally.

Playwright remains the merge-blocking browser gate. uiauto is advisory in this
pair because the safe current path is fixtures mode, and the older uiauto
candidate set does not yet include `admin-media` or the product-content media
review route.

## Evidence Matrix

| Gate | Result | Notes |
| --- | --- | --- |
| Focused component test | PASS | `bun run test src/components/ProductMediaPanel.test.tsx` passed after the MVP. |
| Focused product-content Playwright | PASS | `bunx playwright test e2e/admin-media.spec.ts --project=chromium --grep "product content page manages product media panel"` passed. |
| Playwright stable | PASS | Playwright stable: `56 passed / 2 skipped`. |
| Lighthouse | PASS | `LIGHTHOUSE_URL=http://127.0.0.1:3100/ LIGHTHOUSE_OUTPUT_NAME=v8-p05-qa-home bun run lighthouse:baseline` produced Performance 91, Accessibility 95, Best Practices 96, SEO 100. |
| uiauto fixtures mode | PASS advisory | `runx env personal-shell --exec 'make uiauto-compare'` from the backend ran default fixtures mode and reported total 5, agreed 4, disagreed 1, both pass 4, Playwright-only pass 1, uiauto-only pass 0, self-heal 4. |
| Canonical uiauto command | BLOCKED in this Codex shell | `runx env scrub -- make uiauto-compare` is the documented command, but the inherited Codex shell had GitHub token env vars set; runx correctly refused it. |
| Sentrux | PASS | Pair 5 QA branch-local Sentrux: quality `6430 -> 6426`, no degradation. |
| Agenttrace | PASS with wrapper gap | Agenttrace event was appended for Pair 5 QA gates. `runx worktree run ... cursor-tools agentrace append-event` did not pass stdin; direct `cursor-tools agentrace append-event` from the managed worktree worked. Carry forward a runx stdin passthrough fix. |

## Hydration Drift

Hydration drift was checked through the stable Playwright route matrix and the
product-content focused browser test. The new image edit variants region is
rendered from deterministic mock media assets and updates local React state only
after approve/reject actions, so no server/client timestamp or random-value
drift was introduced.

## uiauto Comparison Boundary

The safe existing uiauto comparison path is fixtures mode:

```text
runx env scrub -- make uiauto-compare
```

In this Codex app shell, `runx env scrub -- make uiauto-compare` refused to run
because the parent process exposed GitHub token env vars. The clean replacement
used for this QA pass was:

```text
runx env personal-shell --exec 'make uiauto-compare'
```

The command ran from the backend and generated
`reports/uiauto-comparison/2026-05-12/diff.json` plus `summary.md` in fixtures
mode. This path uses fixture data and does not require Docker, chromedp, live
OmniParser, VLM, or local LLM inference.

## Remote Vision Readiness

Live remote OmniParser is still not enabled for frontend merge gates. The rule
for future work is unchanged: OmniParser, VLM, and image-understanding workloads
must not run on the MacBook. They must use an approved remote GPU host route
through runx aliases once that route is documented and resource guarded.

## Carry-Forwards

- Add `admin-media` and product-content media review scenarios to
  `test/uiauto/scenarios/` after the uiauto route matrix is updated.
- Add a runx wrapper or stdin passthrough fix for
  `cursor-tools agentrace append-event`.
- Promote remote OmniParser only after an approved runx alias exists and a
  resource guard verifies no local VLM/OmniParser process starts on the MacBook.
- Pair 6 should move image approval execution into Temporal workflows with
  replay tests and signal/query coverage.
