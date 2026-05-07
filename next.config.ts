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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: here,

  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  experimental: {
    typedRoutes: true,
  },

  poweredByHeader: false,
};

export default nextConfig;
