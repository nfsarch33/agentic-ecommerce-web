# Bundle Analysis v5.6.0

## Baseline (pre-v5.6.0)

| Route | Size | First Load JS |
|-------|------|---------------|
| / | 195 B | 106 kB |
| /admin/products/[id]/content | 11.7 kB | 117 kB |
| /admin/compliance | 8.02 kB | 110 kB |
| /admin/agents | 8.29 kB | 114 kB |
| /admin/media | 5.05 kB | 107 kB |
| /admin/settings/webhooks | 4.73 kB | 107 kB |
| /onboarding | 3.44 kB | 106 kB |
| /checkout | 3.39 kB | 109 kB |
| /margin-dashboard | 2.42 kB | 105 kB |
| /payments | 1.86 kB | 104 kB |
| /operator-alerts | 2.06 kB | 104 kB |
| /agent-activity | 1.86 kB | 104 kB |

Shared JS (all routes): **102 kB**
Budget: **<=200 kB** per page
Max First Load JS: **117 kB** (/admin/products/[id]/content)
Status: **All pages within budget**

## Tooling

- `@next/bundle-analyzer` added (run with `ANALYZE=true bun run build:next`)
- `scripts/build-with-bundle-budget.ts` enforces 200 kB First Load JS limit per route
- Bundle report written to `reports/bundle/next-build-summary.json`

## Optimizations Applied

### Lazy Loading (next/dynamic)

Components moved from eager import to `next/dynamic` with skeleton loading states:

1. **OnboardingWizard step components** (IdentityStep, ChannelsStep, ComplianceStep, SeedingStep) -- loaded per-step on demand
2. **MarginDashboard** -- page-level lazy load
3. **PaymentDashboard** -- page-level lazy load
4. **AgentActivityFeed** -- page-level lazy load
5. **OperatorAlertCentre** -- page-level lazy load

### SWR Caching

Global `SWRProvider` in root layout with:
- `revalidateOnFocus: false` (dashboard data, no refetch on tab switch)
- `dedupingInterval: 5000` (5s dedup window)
- `errorRetryCount: 3` with 2s retry interval
- `useSWRApi` hook for BFF API calls with query param support

### Image Optimization

- `next.config.ts` configured with `images.formats: ["image/avif", "image/webp"]`
- `images.remotePatterns` uses `NEXT_PUBLIC_MEDIA_CDN_BASE_URL` env var
- No raw `<img>` tags found in codebase; all future images should use `next/image`

## No-Image Baseline

This is a dashboard application. Currently no product images are rendered.
When product images are introduced:

1. Import `Image` from `next/image`
2. Always set `width` and `height` or use `fill` with a sized parent
3. Set `priority` on above-the-fold hero images
4. Use `sizes` prop to avoid serving oversized images
5. Rely on the avif/webp format negotiation configured in `next.config.ts`
