import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";

// Public-repo Next.js config.
//
// NETWORK POLICY: this app MUST NOT call api.minimaxi.com directly. Any
// MiniMax-routed AI feature MUST proxy through the Tailscale fleet bridge
// configured via env (FLEET_AI_BRIDGE_URL). See app/api/ai-describe/route.ts.

// Tell Next.js where the workspace root is. Without this it auto-detects
// the nearest package-lock.json which may be a stray $HOME lockfile.
const here = dirname(fileURLToPath(import.meta.url));

function mediaCdnRemotePattern(): NonNullable<NextConfig["images"]>["remotePatterns"][number] | undefined {
  const raw = process.env.NEXT_PUBLIC_MEDIA_CDN_BASE_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;

    const pathname = url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/+$/, "")}/**`;
    return {
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname,
    };
  } catch {
    return undefined;
  }
}

const mediaCdnPattern = mediaCdnRemotePattern();

// SECURITY HEADERS (v2.9.0 carryover from v2.8.0 OWASP audit).
//
// We ship six headers on every response:
//  - Content-Security-Policy             reduces XSS / data exfil blast radius
//  - X-Frame-Options: DENY               clickjacking
//  - X-Content-Type-Options: nosniff     MIME sniffing
//  - Referrer-Policy                     no leak of internal paths to third parties
//  - Strict-Transport-Security           force HTTPS (production only)
//  - Permissions-Policy                  disable browser features we do not use
//
// CSP keeps `'unsafe-inline'` + `'unsafe-eval'` in script-src because
// Next.js dev mode injects inline scripts via the React Refresh
// runtime and the production runtime needs `'unsafe-eval'` for the
// turbopack runtime. v3.0.0+ should aim to remove these by adopting
// nonces; for v2.9.0 the CSP frame-ancestors + form-action +
// base-uri restrictions already cut the most common attack surfaces.
//
// connect-src dynamically picks up NEXT_PUBLIC_MC_API_BASE_URL when
// it points at a separate origin (typical for dev / E2E mock runs
// where the Next.js app and the mock API run on different ports).
// Production deployments serve /api/* via a reverse proxy on the same
// origin, so `'self'` continues to cover the canonical case.
function connectSrcHosts(): string[] {
  const hosts = new Set<string>(["'self'", "https://api.stripe.com"]);
  const candidates = [
    process.env.NEXT_PUBLIC_MC_API_BASE_URL,
    process.env.MC_API_BASE_URL,
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed);
      hosts.add(`${url.protocol}//${url.host}`);
    } catch {
      // ignore malformed values
    }
  }
  return Array.from(hosts);
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSrcHosts().join(" ")}`,
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: here,
  allowedDevOrigins: ["localhost", "127.0.0.1"],

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(mediaCdnPattern ? [mediaCdnPattern] : []),
    ],
  },

  typescript: { ignoreBuildErrors: false },

  typedRoutes: true,

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
