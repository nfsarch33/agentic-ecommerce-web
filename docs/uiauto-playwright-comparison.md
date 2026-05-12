# uiauto and Playwright Comparison

This note captures the v6.5.0 frontend-testing position for EC and the v7 path to run `uiauto-framework` beside Playwright.

## Current v6.5.0 Position

| Capability | Playwright | uiauto target |
|------------|------------|---------------|
| Deterministic app flow coverage | Strong; 56 Chromium tests passing with 2 expected skips | Use for independent visual/operator validation |
| Mock backend orchestration | Existing `e2e/run-with-mock.ts` starts a local Bun API and Next server | Reuse the same mock API and route list |
| Lighthouse integration | Existing `scripts/lighthouse-audit.ts` and production server flow | Consume screenshots and DOM state after Lighthouse smoke |
| Visual model dependence | None | Live OmniParser/VLM must run on an approved remote worker only |
| CI suitability | Ready today | Needs resource guard and remote OmniParser route before CI |

## v7 Harness Shape

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
5. Summarize only route, viewport, score, issue count, screenshot path, and model route in committed docs.

## Guardrails

- Do not run OmniParser, VLM, or local LLM inference on developer laptops.
- Route live visual interpretation to an approved remote worker through the approved runx alias once an OmniParser bridge or equivalent alias exists.
- Keep Playwright as the merge-blocking deterministic gate; use uiauto as an additional review signal until it has stable failure semantics.
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
uiauto-only pass 0, self-heal 4. Live OmniParser and VLM interpretation remain
remote-only carry-forwards and were not run on the MacBook.
