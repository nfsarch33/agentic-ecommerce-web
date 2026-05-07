# agentic-ecommerce-web

Public Next.js 15 (App Router) frontend for the
[Agentic Ecommerce](https://github.com/nfsarch33/agentic-ecommerce) Go
backend.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser                                                     │
│   ↓                                                         │
│ Next.js (this repo, PUBLIC)                                 │
│   - Server Components hit the Go backend over HTTPS         │
│   - BFF route handlers under /api/* proxy where needed      │
│   ↓                                                         │
│ ┌─────────────────────┐  ┌─────────────────────────────┐    │
│ │ Go mc-api (private) │  │ minimax-openai-bridge       │    │
│ │ /api/v1/products    │  │  on Tailscale fleet node    │    │
│ │ /api/v1/orders      │  │  (wsl1 / OCI)               │    │
│ │ ...                 │  │  /v1/describe etc.          │    │
│ └─────────────────────┘  └─────────────────────────────┘    │
│                                ↑                            │
│                                │  reads minimax-api-1/2     │
│                                │  via 1Password vault       │
│                          (state-only on MacBook;             │
│                           live API calls happen only        │
│                           on the fleet node)                │
└─────────────────────────────────────────────────────────────┘
```

The Go backend (`agentic-ecommerce`) and this frontend are deliberately
split. The frontend is OSS so contributors can build storefront UI
patterns; the backend keeps business logic, catalog data, and any
private workflows.

## Hard network policy

This app **MUST NOT** call `api.minimaxi.com` or any `*.minimaxi.com`
host directly. AI-routed actions (such as automatic product
descriptions) are proxied through the Tailscale fleet bridge
(`minimax-openai-bridge`) running on a fleet node (wsl1 or OCI). The
bridge URL is supplied via the `FLEET_AI_BRIDGE_URL` env var, and
[`fleetBridgeUrl`](src/lib/adapters/api/ai-describe.ts) refuses any
URL that:

- targets `api.minimaxi.com` or `*.minimaxi.com`
- targets `localhost` / `127.0.0.1` / `::1`
- is outside the Tailscale 100.x range, the `*-travel` aliases,
  `*.oraclecloud.com`, or the canonical fleet hostnames

If `FLEET_AI_BRIDGE_URL` is missing, the BFF returns
`HTTP 503 ai_routing_disabled` rather than silently falling back.

Quota- and rate-limit-aware MiniMax key rotation is implemented in the
sibling
[`runx`](https://github.com/nfsarch33/runx) tool's
`internal/minimaxauth` package and consumed by the bridge.

## Project layout

```
agentic-ecommerce-web/
├── src/
│   ├── app/                      # Next.js App Router (pages + BFF routes)
│   │   ├── api/ai-describe/      # BFF route for AI-routed describe
│   │   ├── products/             # Storefront product list page
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/               # Atomic React components
│   ├── lib/
│   │   ├── domain/               # Pure domain entities (Product, Money, ...)
│   │   ├── usecases/             # Application use cases
│   │   └── adapters/api/         # HTTP clients to the Go backend + bridge
│   └── test/                     # Test setup
├── e2e/                          # Playwright end-to-end specs
├── eslint.config.mjs
├── next.config.ts
├── playwright.config.ts
├── postcss.config.mjs            # Tailwind v4
├── tsconfig.json                 # strict + noUncheckedIndexedAccess
├── vitest.config.ts              # 80% coverage thresholds
└── package.json
```

The directory layout follows Clean Architecture:

- **domain**: zero deps, pure functions, entities, value objects
- **usecases**: orchestration, depends on domain + adapter interfaces
- **adapters/api**: HTTP / external-service implementations
- **components / app**: presentation, depends on usecases + domain only

Tests live next to the code they cover (`*.test.ts` / `*.test.tsx`).

## Quality gates

| Gate                  | Command               | Threshold                     |
|-----------------------|-----------------------|-------------------------------|
| TypeScript strict     | `bun run typecheck`   | zero errors                   |
| Unit tests            | `bun run test`        | ≥ 80% lines, branches ≥ 75%   |
| ESLint (next + ts)    | `bun run lint`        | zero errors                   |
| Production build      | `bun run build`       | First Load JS < 200 kB        |
| Playwright smoke      | `bun run test:e2e`    | green on Chromium             |

## Local development

Requires:

- [bun](https://bun.sh) ≥ 1.3.0
- a running Go backend at `MC_API_BASE_URL` (default
  `http://localhost:8080`) — see
  [agentic-ecommerce](https://github.com/nfsarch33/agentic-ecommerce)
- a Tailscale fleet bridge URL exported as `FLEET_AI_BRIDGE_URL` if
  you want to exercise the AI describe route. **Never** point this at
  `api.minimaxi.com` or `localhost`.

```bash
bun install
bun run dev
```

The dev server runs on http://localhost:3000 by default.

### Environment variables

| Var                    | Default                       | Notes                                  |
|------------------------|-------------------------------|----------------------------------------|
| `MC_API_BASE_URL`      | `http://localhost:8080`       | Private Go backend base URL            |
| `FLEET_AI_BRIDGE_URL`  | _(unset)_                     | Tailscale fleet bridge (validated)     |
| `PORT`                 | `3000`                        | Next.js dev server port                |

## Contributing

This is a public OSS repo under the Apache-2.0 licence. Pull requests
welcome for storefront UI improvements, accessibility, performance, and
test coverage. Backend / business-logic changes belong in the private
[`agentic-ecommerce`](https://github.com/nfsarch33/agentic-ecommerce)
repo.
