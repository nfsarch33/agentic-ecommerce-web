import { defineConfig, devices } from "@playwright/test";

// Playwright runs Next.js with a deterministic mock mc-api by default.
// CI can override webServer.url to hit a containerised build.
const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true";
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The current E2E harness runs one Next.js server and one in-memory mock API.
  // Keep the single Chromium project serial until the mock server is worker-isolated.
  workers: 1,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: disableWebServer
    ? undefined
    : {
        command: "bun run e2e:web",
        url: baseURL,
        reuseExistingServer,
        timeout: 120_000,
      },
});
