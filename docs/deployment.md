# Frontend Deployment Guide

The frontend deploys as a Next.js 15 application using standalone output. It is wired into the stack through Docker Compose for local/full-stack smoke tests, then through managed container services for cloud deployments. Backend infrastructure, Terraform, databases, Temporal server, n8n, S3/GCS buckets, and CDN provisioning are owned by the backend/infra repo; this repo only documents the frontend runtime contract.

## Docker Image

Build the production image from this repo:

```bash
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v2.0.0} .
```

The Dockerfile runs `next build` with `output: "standalone"` and copies `.next/standalone`, `.next/static`, and `public` into a non-root Node 22 Alpine runtime. The image exposes port `3000` and includes a liveness healthcheck against `/healthz`.

The backend `docker-compose.yml` consumes the image through `WEB_IMAGE_TAG`. For a full-stack smoke, run Compose from the backend repo after setting matching backend and frontend image tags in `.env.compose`.

## Environment Variables

Use `.env.production.example` as the deployment template. Copy these values into the cloud runtime environment or secret manager, not into the built image.

| Variable | Required | Boundary |
| --- | --- | --- |
| `MC_API_BASE_URL` | Yes | Server-side base URL for the Go backend, reachable from the Next.js container. |
| `NEXT_PUBLIC_MC_API_BASE_URL` | Yes for browser admin widgets | Public HTTPS backend URL used by client components. |
| `NEXT_PUBLIC_APP_ORIGIN` | Production | Public storefront origin used for metadata, readiness, CDN/reverse-proxy policy, and canonical deployment docs. |
| `NEXT_PUBLIC_SITE_URL` | Legacy fallback | Backwards-compatible fallback for `NEXT_PUBLIC_APP_ORIGIN`; prefer the new variable. |
| `NEXT_PUBLIC_MEDIA_CDN_BASE_URL` | Production media deployments | Public CDN base URL for media backed by S3/GCS object storage. |
| `NEXT_PUBLIC_N8N_URL` | Optional | Admin-only external link to the deployed n8n UI when protected by auth and TLS. |
| `NEXT_PUBLIC_TEMPORAL_UI_URL` | Optional | Admin-only external link to Temporal UI when it is intentionally exposed behind auth and TLS. |
| `AUTH_COOKIE_SECURE` | Production | Set to `true` behind HTTPS. Defaults to true when `NODE_ENV=production`. |
| `AUTH_COOKIE_SAME_SITE` | Production | `lax`, `strict`, or `none`. `none` forces secure cookies for browser compatibility. |
| `AUTH_COOKIE_DOMAIN` | Optional | Shared cookie domain such as `.example.com` when frontend/API subdomains require it. |
| `FLEET_AI_BRIDGE_URL` | Only for AI fallback | Approved bridge URL for `/api/ai-describe`; never direct MiniMax. |
| `CSP_CONNECT_SRC` | Production | Header allowlist for backend, BFF, and CDN connections. |
| `CSP_REPORT_URI` | Optional | CSP reporting endpoint. |
| `REFERRER_POLICY` | Production | Deployment-platform header value. |
| `PERMISSIONS_POLICY` | Production | Deployment-platform header value. |

Do not expose secret values through `NEXT_PUBLIC_*` variables. Backend credentials, JWT signing material, WooCommerce keys, bridge credentials, Temporal credentials, and n8n secrets belong in the backend, bridge, Temporal, or n8n runtime.

## Health Checks

The frontend exposes two cloud-friendly endpoints:

- `/healthz`: lightweight liveness check. It returns `200` when the Next.js runtime can serve requests and is used by the Docker `HEALTHCHECK`.
- `/readyz`: deployment configuration readiness. It validates required URL-shaped config and returns `503` when production config is incomplete or malformed.

Use `/healthz` for container liveness and load balancer health. Use `/readyz` as a deployment smoke check after setting `MC_API_BASE_URL`, `NEXT_PUBLIC_APP_ORIGIN`, and any optional public URLs.

## AWS Deployment Notes

For AWS, publish the image to GHCR or ECR, then run it behind ECS Fargate or App Runner with HTTPS ingress through an ALB and/or CloudFront. The frontend task needs only the image tag, port `3000`, the env vars above, and outbound access to `MC_API_BASE_URL`.

Recommended shape:

- CloudFront or ALB terminates TLS for `NEXT_PUBLIC_APP_ORIGIN`.
- Backend API is exposed through a separate HTTPS origin such as `https://api.example.com`, or through a reverse-proxy path if the backend CORS policy allows it.
- Media assets are served from S3 through CloudFront, with `NEXT_PUBLIC_MEDIA_CDN_BASE_URL` set to that public CDN base path.
- n8n and Temporal UI are linked only if they are intentionally exposed behind authentication and TLS.
- Secrets Manager injects non-public values into the backend/infra services; the frontend should not receive backend secrets.

## GCP Deployment Notes

For GCP, publish the image to Artifact Registry and deploy it to Cloud Run behind the managed HTTPS endpoint or an external HTTPS load balancer. Set the container port to `3000` and keep the frontend stateless.

Recommended shape:

- Cloud Run or an HTTPS load balancer terminates TLS for `NEXT_PUBLIC_APP_ORIGIN`.
- `MC_API_BASE_URL` points to the private or public Go API endpoint reachable from Cloud Run, while `NEXT_PUBLIC_MC_API_BASE_URL` points to the browser-reachable HTTPS endpoint.
- Media assets are served from GCS through Cloud CDN, with `NEXT_PUBLIC_MEDIA_CDN_BASE_URL` set to the Cloud CDN base path.
- Secret Manager owns backend, Temporal, n8n, WooCommerce, and bridge credentials; expose only non-secret public URLs to the frontend.

## CDN and Media

Media URLs returned by the backend should be absolute HTTPS URLs rooted at `NEXT_PUBLIC_MEDIA_CDN_BASE_URL`. The current media components render backend-provided previews directly, and `next.config.ts` also derives a Next Image `remotePatterns` allowlist from `NEXT_PUBLIC_MEDIA_CDN_BASE_URL` so future `<Image>` usage is constrained to the configured CDN.

Keep supplier-origin images and temporary object-store URLs out of long-lived public pages. The backend media workflow should persist approved assets to S3/GCS, return CDN URLs to the frontend, and attach alt text plus QA metadata.

## Reverse Proxy and TLS

Terminate TLS at the CDN, ALB, HTTPS load balancer, Cloud Run, Caddy, or nginx. Forward `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` so upstream logs and backend policy can correlate browser requests. For production, set:

- `AUTH_COOKIE_SECURE=true`.
- `AUTH_COOKIE_SAME_SITE=lax` for same-site frontend/API subdomains, or `none` only when cross-site embedding requires it.
- HSTS at the TLS edge after the domain is stable.
- CSP `connect-src` limited to the storefront origin, backend API origin, same-origin BFF routes, and media CDN.
- CSP `frame-ancestors` or `X-Frame-Options` denying untrusted embedding.
- `X-Content-Type-Options: nosniff`.
- `Permissions-Policy` disabling unused browser capabilities.

Cloud allowed origins are enforced at the backend CORS policy, CDN/reverse proxy, and browser security headers. This frontend has no server actions requiring Next.js server-action allowed-origin configuration; `allowedDevOrigins` remains local-development only.

## Release Smoke

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run test:coverage
bun run build
docker build -t ghcr.io/nfsarch33/agentic-ecommerce-web:${IMAGE_TAG:-v2.0.0} .
```

Then run:

```bash
runx shell-leak-scan --repo agentic-ecommerce-web
sentrux gate .
```

Run `bun run test:e2e` when a browser runtime is available and the backend or mock server is reachable.
