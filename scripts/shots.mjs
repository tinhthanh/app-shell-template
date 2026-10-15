// Screenshots of the app in Default Dark and Default Light, for a PR's
// Proof section: builds, serves dist on a free port, and writes shots/.
//
//   pnpm shots                      every view
//   pnpm shots '#/kit/buttons'      one address (any hash)
//   E2E_PORT=1427 pnpm shots        on that port
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "shots");
const addresses = process.argv[2] ? [process.argv[2]] : ["", "#/projects", "#/projects/p-shop", "#/kit/buttons", "#/kit/feedback", "#/settings/appearance"];

// E2E_PORT, or a free port in 1421–1439 (1420 is the dev server's).
async function freePort() {
  if (process.env.E2E_PORT) return Number(process.env.E2E_PORT);
  for (let p = 1421; p <= 1439; p++) {
    const ok = await new Promise((r) => {
      const s = createServer()
        .once("error", () => r(false))
        .once("listening", () => s.close(() => r(true)));
      s.listen(p, "127.0.0.1");
    });
    if (ok) return p;
  }
  throw new Error("no free port in 1421–1439");
}

const build = spawnSync("node_modules/.bin/vite", ["build"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
const port = await freePort();
const server = spawn("node_modules/.bin/vite", ["preview", "--port", String(port), "--strictPort"], { cwd: root, stdio: "ignore" });
try {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://localhost:${port}/`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  mkdirSync(out, { recursive: true });
  for (const theme of ["default-dark", "default-light"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript((t) => localStorage.setItem("app.ui", JSON.stringify({ themeId: t })), theme);
    const page = await context.newPage();
    for (const a of addresses) {
      await page.goto(`http://localhost:${port}/?mock=1&platform=linux${a}`);
      await page.getByTestId("nav-home").waitFor();
      await page.evaluate(() => Promise.all(document.getAnimations().map((x) => x.finished.catch(() => {}))));
      const name = `${a.replace(/^#\//, "").replace(/[/?&=]/g, "-") || "home"}-${theme.replace("default-", "")}.png`;
      await page.screenshot({ path: resolve(out, name) });
      console.log(`shots/${name}`);
    }
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
