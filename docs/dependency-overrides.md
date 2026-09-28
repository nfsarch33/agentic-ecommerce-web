# Dependency overrides

Why each `overrides` entry in `package.json` exists, which advisories it
closes, and when it can go. `bun audit --audit-level=high` must exit 0;
these entries are the minimum set that achieves it. Two of them force a
version outside a consumer's declared range (`js-yaml` over an exact pin,
`sharp` over `next`'s `^0.34`); each row says why that is acceptable.

| Override | Advisory(ies) | Why an override | Revisit |
|---|---|---|---|
| `js-yaml: 4.3.2` | GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh | `@redocly/openapi-core` (via `openapi-typescript`) pins `js-yaml` at exactly `4.1.1`; a range bump can never reach 4.3.x. All consumers are on 4.x, so the override stays in-major. | When `@redocly/openapi-core` ships a 4.3.x+ pin; check on dependency refreshes, next review 2026-12-28. |
| `sharp: 0.35.5` | GHSA-f88m-g3jw-g9cj (libvips CVEs), GHSA-rgj7-g3m4-5g8c (libheif) | `next` declares `sharp` as an optional dependency with `^0.34`; no 0.34.x release is patched. On 0.x a caret locks the minor, so 0.35 is outside next's declared range. Acceptable today because nothing in `src/` renders `next/image`; the only runtime consumer is the `/_next/image` optimiser for the configured remote pattern. Before any page adopts `next/image`, add an e2e that fetches one optimised image. | When `next` declares `^0.35`; next review 2026-12-28. |
| `vite: 7.3.6` | GHSA-fx2h-pf6j-xcff (`server.fs.deny` bypass, vite ≤7.3.4) | The advisory forces ≥7.3.5; the pin at 7.3.6 (not 8.x) keeps the jump minimal for `vitest` 3.2.x. | When `vitest`'s own range lands on vite 8; next review 2026-12-28. |

Notable **non-override** moves that closed advisories (kept here so the
next auditor does not re-derive them):

- `lighthouse` 13.2.0 → 13.5.0 (in-range): brings `puppeteer-core` 25.9.0
  whose `@puppeteer/browsers` 3.2.1 **dropped `extract-zip` entirely** —
  that package had NO patched release (≤2.0.1 all vulnerable), so removing
  the consumer was the only fix. Also refreshes `ws` to 8.22.0.
- `next` ^16.3.6, `vitest` ^3.2.7, `@vitejs/plugin-react` ^5.0.0
  (in-range/bumped): close their own advisories; plugin-react 5 is the
  first line typed against vite 7.3's rolldown types.
- Transitive re-resolution (fresh lockfile): `brace-expansion` 1.1.21 /
  2.1.7 / 5.0.12, `ws` 7.5.13 / 8.22.0, `nanoid` 3.3.19, `postcss` 8.5.23
  (next's own pin) / 8.5.28 (root), `browserslist` 4.29.1, all within
  their parents' declared ranges; no override needed.

The previous `overrides.postcss ^8.5.14` is removed: `next` 16.3.6 pins
its own `postcss` at 8.5.23 and the root devDependency is `^8.5.28`, so no
installed copy is below the old floor (`bun audit` stays at exit 0 without
it).

No package is added to `dependencies` for the audit. A top-level copy of
a transitive package does not patch the nested copies an advisory is
about, and it ships in the production image.
