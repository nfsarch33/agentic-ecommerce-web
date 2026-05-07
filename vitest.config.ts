import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Vitest config: jsdom for component tests, sane coverage thresholds,
// and the same @/ import alias as Next.js so tests can drop into the
// same module graph without ceremony.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
