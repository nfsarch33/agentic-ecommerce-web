# uiauto and Playwright Comparison

This note captures the current v9/v10 frontend-testing position for EC and the
primary-lane path to run `uiauto-framework` beside Playwright.

## Current v9/v10 Position

| Capability | Playwright | uiauto target |
|------------|------------|---------------|
| Deterministic app flow coverage | Strong; stable Chromium flow remains the deterministic gate | Required as blocking primary-lane comparison evidence |
| Mock backend orchestration | Existing `e2e/run-with-mock.ts` starts a local Bun API and Next server | Reuse the same mock API and route list |
| Lighthouse integration | Existing `scripts/lighthouse-audit.ts` and production server flow | Consume screenshots and DOM state after Lighthouse smoke |
| Visual model dependence | None | Live OmniParser/VLM must run on an approved remote worker only |
| Release evidence | `.gitlab-artifacts/playwright/playwright-stable.log` and `.gitlab-artifacts/playwright/playwright-report/` | `.gitlab-artifacts/uiauto/uiauto-compare.log` plus `reports/uiauto-comparison/<date>/summary.md` |

## Harness Shape

1. Start the existing mock backend and production Next server with runx-managed ports.
2. Run Playwright first for deterministic interaction and assertion coverage.
3. Run uiauto as an observer pass over the same route matrix:
   - `/`
   - `/products`
   - `/products/resistance-band-set`
   - `/marketplace`
   - `/marketplace/stripe-payments`
   - `/admin`
4. Store uiauto observations as NDJSON under ignored `reports/uiauto/`.
5. Record the lane log at `.gitlab-artifacts/uiauto/uiauto-compare.log`.
6. Summarize only route, viewport, score, issue count, screenshot path, and
   model route in `reports/uiauto-comparison/<date>/summary.md`.

## Guardrails

- Do not run OmniParser, VLM, or local LLM inference on developer laptops.
- Route live visual interpretation to an approved remote worker through the approved runx alias once an OmniParser bridge or equivalent alias exists.
- Keep Playwright as the deterministic gate and run uiauto as blocking primary-lane evidence for the same release slice.
- Close browsers and Sentrux desktop processes after each cycle.

## v8 Pair 5 QA Update

Pair 5 keeps Playwright as the deterministic gate for the product image variant
review UX. The new browser coverage lives in `e2e/admin-media.spec.ts` under the
product-content media review flow and covers the `admin-media` route family.

The safe uiauto path remains fixtures mode. The documented command is:

```text
runx env scrub -- make uiauto-compare
```

In the Codex app shell used for Pair 5 QA, the scrub command correctly blocked
because inherited GitHub token env vars were present. The clean-session variant
that completed was:

```text
runx env personal-shell --exec 'make uiauto-compare'
```

Result: total 5, agreed 4, disagreed 1, both pass 4, Playwright-only pass 1,
uiauto-only pass 0, self-heal 4. The comparison remains part of the blocking
primary-lane evidence bundle even while live OmniParser and VLM interpretation
stay remote-only carry-forwards.
