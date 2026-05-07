# Frontend Deployment Guide

The frontend deploys as a Next.js 15 application and is wired into the stack through Docker Compose first, then cloud services once backend infrastructure is approved.

## Docker Image

Build the production image from this repo:

```bash
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v1.0.0} .
```

The backend `docker-compose.yml` consumes the image through `WEB_IMAGE_TAG`. For a full-stack smoke, run Compose from the backend repo after setting matching backend and frontend image tags in `.env.compose`.

## Environment Variables

Use `.env.production.example` as the deployment template.

| Variable | Required | Boundary |
| --- | --- | --- |
| `MC_API_BASE_URL` | Yes | Server-side base URL for the Go backend. |
| `NEXT_PUBLIC_APP_ORIGIN` | Production | Public storefront origin for docs and deployment headers. |
| `FLEET_AI_BRIDGE_URL` | Only for AI fallback | Approved bridge URL for `/api/ai-describe`; never direct MiniMax. |
| `CSP_CONNECT_SRC` | Production | Header allowlist for backend and BFF connections. |
| `CSP_REPORT_URI` | Optional | CSP reporting endpoint. |
| `REFERRER_POLICY` | Production | Deployment-platform header value. |
| `PERMISSIONS_POLICY` | Production | Deployment-platform header value. |

Do not expose secret values through `NEXT_PUBLIC_*` variables. Backend credentials, JWT signing material, WooCommerce keys, and bridge credentials belong in the backend or bridge runtime, not in the frontend image.

## AWS ECS / GCP Cloud Run

The v1.0.0 cloud path is dry-run only and is owned by the backend Terraform contracts:

- AWS ECS service shape: `agentic-ecommerce/deploy/terraform/aws-ecs`.
- GCP Cloud Run service shape: `agentic-ecommerce/deploy/terraform/gcp-cloudrun`.

For the frontend, the cloud runtime needs the container image tag, `MC_API_BASE_URL`, public origin, and deployment-platform security headers. Keep data stores private behind the backend; expose only intended HTTPS ingress.

## Security Headers

Configure these at the CDN, reverse proxy, or hosting platform:

- Content Security Policy with a narrow `connect-src` for the deployed backend and same-origin BFF routes.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `X-Frame-Options` or CSP `frame-ancestors` denying untrusted embedding.
- `X-Content-Type-Options: nosniff`.
- `Permissions-Policy` disabling unused browser capabilities.

## Release Smoke

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build
```

Run `bun run test:e2e` when a browser runtime is available and the backend or mock server is reachable.
