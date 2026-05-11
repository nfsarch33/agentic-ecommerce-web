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
