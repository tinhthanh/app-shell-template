import { defineConfig, devices } from "@playwright/test";

// The browser suite (e2e/): the production build, served by vite preview,
// in Chromium, on the mock fixtures (?mock=1). pnpm test:e2e builds first.
// E2E_PORT picks the port (1421–1439 leave the dev server's 1420 alone).

const port = Number(process.env.E2E_PORT ?? 1434);

export default defineConfig({
  testDir: "e2e",
  outputDir: "node_modules/.e2e-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A failure is a failure: the fixtures are fixed and nothing waits on time.
  retries: 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
