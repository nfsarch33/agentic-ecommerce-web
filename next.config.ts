import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: here,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  ...(mediaCdnPattern ? { images: { remotePatterns: [mediaCdnPattern] } } : {}),

  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  typedRoutes: true,

  poweredByHeader: false,
};

export default nextConfig;
