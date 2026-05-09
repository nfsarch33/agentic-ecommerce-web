import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Vitest config: jsdom for component tests, sane coverage thresholds,
// and the same @/ import alias as Next.js so tests can drop into the
// same module graph without ceremony.
//
// testTimeout/hookTimeout: bumped from the 5000ms default to absorb the
// cold-cache TypeScript transform that CI runners hit on the first parallel
// pass. Component tests with `userEvent` chains plus Next.js dynamic
// imports can spend 4-6s in the first transform alone, which flakes the
// otherwise deterministic suite. The 2026-05-08 v2.0.0 validation report
// captured these as cold-cache timeouts on `ComplianceReportingPanel.test`,
// `MediaLibrary.test`, and a handful of other component tests that pass
// on warm cache. Bumping the per-test budget to 15s removes the flake
// without masking real regressions; functions that genuinely run for
// >5s are still flagged via duration metrics.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/coverage/**",
        "src/test/**",
        "**/*.config.{ts,js,mjs}",
        "playwright.config.ts",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/page.tsx",
        // v2.9.0 server-only pages: matches the src/app/page.tsx exclusion
        // pattern. These pages are App Router server components that
        // render markdown/content under static metadata. They are
        // exercised end-to-end by Playwright but are not meaningful for
        // vitest unit coverage. See ADR-026 §"v3.0.0 Coverage Target".
        "src/app/developers/page.tsx",
        "src/app/developers/api/page.tsx",
        "src/app/developers/sdk/page.tsx",
        "src/app/developers/getting-started/page.tsx",
        "src/app/marketplace/page.tsx",
        "src/app/marketplace/[slug]/page.tsx",
        "src/app/marketplace/categories/[category]/page.tsx",
        "src/app/marketplace/search/page.tsx",
        "src/app/api/**",
        "scripts/**",
        "e2e/**",
        "src/lib/adapters/api/generated/**",
        "next-env.d.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
