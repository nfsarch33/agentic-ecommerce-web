# Frontend BFF Routes

The frontend keeps browser-facing session and AI helper routes under `src/app/api`. These routes are intentionally small boundaries around the Go backend and the approved AI bridge. The current admin surfaces call the Go backend through typed adapters; they do not introduce BFF routes for Temporal, n8n, media, tenant, compliance, or webhook operations.

## Route Inventory

| Route | Method | Purpose | Upstream |
| --- | --- | --- | --- |
| `/api/auth/login` | `POST` | Validate login input, call backend login, and set the httpOnly session cookie. | `POST /api/v1/auth/login` |
| `/api/auth/me` | `GET` | Read the session cookie and fetch the current backend session. | `GET /api/v1/auth/me` |
| `/api/auth/logout` | `POST` | Best-effort backend logout and browser session cookie clear. | `POST /api/v1/auth/logout` |
| `/api/ai-describe` | `POST` | Optional AI describe fallback through the approved fleet bridge. | OpenAI-compatible bridge endpoint |

## Security Boundaries

- BFF routes run in the Node.js runtime and must not expose backend tokens, bridge URLs, or secret values to the browser.
- The auth routes store the backend access token in an httpOnly cookie. Frontend role checks are convenience UI only; backend JWT validation and RBAC remain authoritative.
- `/api/ai-describe` resolves `FLEET_AI_BRIDGE_URL` server-side and rejects direct MiniMax, loopback, or unapproved bridge targets through `fleetBridgeUrl`.
- If `FLEET_AI_BRIDGE_URL` is unset, `/api/ai-describe` returns `503 ai_routing_disabled` instead of falling back to any direct provider endpoint.

## Backend API Contract

The backend source of truth is `agentic-ecommerce/api/openapi.yaml`. Regenerate frontend types after backend API changes, including workflow, media, tenant, compliance, and webhook schema updates:

```bash
bun run api:generate
```

The legacy docs `docs/v030-sync-contract.md` and `docs/v060-agent-contract.md` remain as frontend implementation notes for surfaces that landed before generated schema refreshes. Admin UX behavior for workflows, media, tenant settings, and n8n/webhooks is documented in `docs/admin-operations.md`.
