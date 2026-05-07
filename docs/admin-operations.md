# v2.0.0 Admin Operations

The v2.0.0 admin UI is the operator console for backend workflows, Media Intelligence, tenant-aware settings, compliance reporting, and n8n-backed automation. The frontend presents and validates UI state; the Go backend remains authoritative for auth, RBAC, tenant scope, workflow execution, webhook signing, media storage, and compliance results.

## Navigation Surfaces

| Admin path | Purpose | Backend contract |
| --- | --- | --- |
| `/admin/workflows` | List workflow runs and current status. | `GET /api/v1/workflows/{id}` plus workflow start routes documented in backend `docs/temporal-workflow-specs.md`. |
| `/admin/workflows/[id]` | Inspect an activity timeline and terminal state. | Workflow status response from `api/openapi.yaml`. |
| `/admin/media` | Browse sourced media assets, quality status, and metadata. | `/api/v1/media/source`, `/api/v1/media/process`, `/api/v1/media/{id}`, `/api/v1/media/{id}/validate`. |
| `/admin/products/[id]/content` | Review generated content, RAG/fact-check evidence, media state, and compliance readiness. | RAG, compliance, media, and workflow routes from backend OpenAPI. |
| `/admin/settings/webhooks` | Register, test, and delete outbound webhooks for n8n or other approved receivers. | `/api/v1/webhooks`, `/api/v1/webhooks/{id}`, `/api/v1/webhooks/{id}/test`. |
| `/admin/settings/tenant` | Edit tenant branding, WooCommerce credential references, AI preferences, and compliance overrides. | `/api/v1/tenant/settings`. |
| `/admin/compliance` | View pass/fail trends, custom rules, and export controls. | `/api/v1/compliance/custom-rules`, `/api/v1/compliance/reports/summary`, `/api/v1/compliance/reports/export`. |

## Workflow Operations

Temporal workflow execution is backend-owned. The frontend should:

- Start workflows only through authenticated backend routes.
- Display workflow IDs, run IDs, status, activity timeline entries, and error messages without inventing local terminal states.
- Poll the status endpoint until `completed`, `failed`, `cancelled`, `rejected`, or `needs_review`.
- Send human-review decisions through the backend signal route rather than calling Temporal directly.
- Link to `NEXT_PUBLIC_TEMPORAL_UI_URL` only when the operator has intentionally exposed a protected Temporal UI.

The browser and Next.js server must not connect to Temporal gRPC.

## Media Intelligence Operations

Media state is sourced from backend API responses. The frontend may preview URLs returned by the backend and CDN configuration, but it must not store supplier credentials, object-store credentials, or temporary upload secrets. Production media URLs should be HTTPS and rooted in the configured CDN or backend-approved public base URL.

Use `NEXT_PUBLIC_MEDIA_CDN_BASE_URL` to constrain Next Image remote patterns for future image optimization. Do not add arbitrary supplier domains to public image allowlists.

## Tenant and Compliance Operations

The v2.0.0 UI is tenant-aware but does not provision tenants. Tenant IDs are selected from backend-provided or locally configured context and used to scope settings, compliance rules, reports, media, RAG evidence, and webhook registrations.

Frontend role checks are convenience UI only. Backend JWT validation, RBAC, tenant scope, custom rule versioning, and compliance report generation are authoritative.

## n8n and Webhooks

n8n is accessed through an optional admin link, not embedded credential handling. Configure:

```bash
NEXT_PUBLIC_N8N_URL=
```

Only expose this URL when the n8n instance is protected by authentication and TLS. The frontend webhook settings page registers backend outbound webhooks that can target n8n HTTP triggers. It must never store raw signing secrets in browser storage; secrets are submitted once to the backend and displayed only as references or hashes afterward.

## Validation

Run focused frontend gates after admin documentation or route-adapter changes:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
runx shell-leak-scan --repo agentic-ecommerce-web
```

Run `bun run test:e2e:stable` when a browser runtime is available and the backend or mock API is reachable.
