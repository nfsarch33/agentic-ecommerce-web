# uiauto vs Playwright comparison report -- {{ DATE }}

This template is consumed by the backend's `cmd/uiauto-compare`
generator. The generator fills in the variables marked `{{ ... }}` at
emit time and copies the result into
`reports/uiauto-comparison/{{ DATE }}/summary.md` in the global-kb repo.

## Run metadata

- Backend SHA: `{{ BACKEND_SHA }}`
- Frontend SHA: `{{ FRONTEND_SHA }}`
- uiauto-framework SHA: `{{ UIAUTO_SHA }}`
- Mode: `{{ MODE }}` (fixtures | runtime)
- Started at: `{{ STARTED_AT }}`
- Finished at: `{{ FINISHED_AT }}`
- Comparison duration: `{{ DURATION_MS }} ms`

## Summary

| Metric | Count |
|---|---:|
| Total scenarios | {{ TOTAL }} |
| Agreement | {{ AGREED }} |
| Disagreement | {{ DISAGREED }} |
| Both pass | {{ BOTH_PASS }} |
| Both fail | {{ BOTH_FAIL }} |
| Playwright only pass | {{ PW_ONLY_PASS }} |
| uiauto only pass | {{ UI_ONLY_PASS }} |
| Self-heal events total | {{ SELFHEAL_TOTAL }} |

## Per-scenario detail

| Spec | Playwright | uiauto | Tier | Self-heal | Agreement |
|---|---|---|---|---:|:---:|
{{ ROWS }}

## Anchors used per runner

For each scenario, list the selectors actually exercised. Playwright
captures these via the JSON reporter `steps[].selector` field; uiauto
captures them via `demo-results.json[].selector`.

{{ PER_SCENARIO_SELECTORS }}

## Self-heal events

Only scenarios where uiauto's `Smart` or `VLM` tier was engaged.

{{ PER_SCENARIO_SELFHEAL }}

## Initial assessment

A free-form section the operator fills in by hand after reading the
diff.json output. Should answer:

1. Which Playwright flake categories did uiauto self-healing actually
   catch in this run? Cite the scenario + step index.
2. Where did Playwright pass but uiauto fail? Is the cause a missing
   `wait` action in the scenario JSON, a chromedp/CDP gap, or a real
   regression?
3. Where did uiauto pass but Playwright fail? Is the recovery
   reproducible (cached pattern), or did it require Smart/VLM
   escalation?
4. Are there scenarios that should be reclassified (e.g. promoted to
   high priority, or removed) on the next [`CANDIDATES.md`](CANDIDATES.md)
   refresh?
5. Does the v4 gate-vs-advisory case strengthen or weaken with this run?

## Cross-references

- Backend PR: `{{ BACKEND_PR_URL }}`
- Frontend PR: `{{ FRONTEND_PR_URL }}`
- global-kb PR: `{{ GLOBAL_KB_PR_URL }}`
- diff.json: `{{ DIFF_JSON_PATH }}`
- Prior revalidation evidence: add the matching global-kb research report for the current release cycle.
- Planning artifact: add the controlling release or sprint plan reference for this run.
