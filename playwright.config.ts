import { defineConfig, devices } from "@playwright/test";

// The browser suite (e2e/): the production build, served by vite preview,
// in Chromium, on the mock fixtures (?mock=1). pnpm test:e2e builds first.
// E2E_PORT picks the port (1421–1439 leave the dev server's 1420 alone).
//
// e2e/visual.spec.ts compares screenshots with Linux baselines
// (e2e/snapshots/): it runs on Linux (CI), or anywhere with VISUAL=1,
// which pnpm test:visual sets inside the Playwright Linux image
// (scripts/visual.mjs). E2E_SERVE=static serves dist/ with
// scripts/serve-dist.mjs there, where vite preview cannot run.

const port = Number(process.env.E2E_PORT ?? 1434);
const visual = process.platform === "linux" || !!process.env.VISUAL;

export default defineConfig({
  testDir: "e2e",
  testIgnore: visual ? [] : ["**/visual.spec.ts"],
  outputDir: "node_modules/.e2e-results",
  // One baseline per scene, Linux's: no platform suffix.
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A failure is a failure: the fixtures are fixed and nothing waits on time.
  retries: 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    // A scene is the same picture. The renders are the same Chromium on the
    // same Linux, so a handful of pixels is all the slack there is: a label
    // moved by a few pixels is a difference (a ratio of the page let it by).
    toHaveScreenshot: { maxDiffPixels: 20, threshold: 0.1, animations: "disabled", caret: "hide" },
  },
  // E2E_REPORT=1 (CI) writes the HTML report and a JUnit file beside the
  // results: the evidence a PR links to.
  reporter: [
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
    ...(process.env.E2E_REPORT ? [["html", { open: "never", outputFolder: "node_modules/.e2e-report" }] as const, ["junit", { outputFile: "node_modules/.e2e-results/junit.xml" }] as const] : []),
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.E2E_SERVE === "static" ? `node scripts/serve-dist.mjs ${port}` : `pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
