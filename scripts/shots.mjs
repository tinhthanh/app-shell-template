// Screenshots of the app in Default Dark and Default Light, for a PR's
// Proof section: builds, serves dist on a free port, and writes shots/.
//
// Open the pictures and look at them before calling a UI change done: a
// clipped label or a lost margin passes every test.
//
//   pnpm shots                      every scene in e2e/scenes.json (the desktop ones)
//   pnpm shots '#/kit/buttons'      one address (any hash)
//   pnpm shots --phone              at a phone's width (375), named …-phone-dark.png
//   E2E_PORT=1427 pnpm shots        on that port (else a free one, scripts/free-port.mjs)
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { freePort } from "./free-port.mjs";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "shots");
// A scene names the testid that says its view has its data (ready); a
// bare address waits for the view's root and its loader to go.
const scenes = JSON.parse(readFileSync(resolve(root, "e2e/scenes.json"), "utf8")).filter((s) => !s.width);
const args = process.argv.slice(2);
const phone = args.includes("--phone");
const asked = args.find((a) => !a.startsWith("--"));
const addresses = asked ? [{ hash: asked }] : scenes;
// The phone's size is the visual suite's (e2e/visual.spec.ts).
const viewport = phone ? { width: 375, height: 740 } : { width: 1440, height: 900 };

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
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.addInitScript((t) => localStorage.setItem("app.ui", JSON.stringify({ themeId: t })), theme);
    const page = await context.newPage();
    for (const { hash: a, ready } of addresses) {
      await page.goto(`http://localhost:${port}/?mock=1&platform=linux${a}`);
      // The shell is up: the sidebar, Settings' own list in its place, or the phone bar.
      await page.getByTestId("nav-home").or(page.getByTestId("settings-back")).or(page.getByTestId("phone-bar")).first().waitFor();
      // The view's code loads after the shell, and its data after that: wait
      // for what says it is there, or for the view's root and its loader to go.
      // A page's root can be there before its data, so the loader has to go too.
      if (ready) await page.getByTestId(ready).first().waitFor();
      else await page.locator("main [data-testid]").first().waitFor();
      await page.locator('[data-testid$="-loading"]').first().waitFor({ state: "detached" });
      // The sidebar's sheet shows its workspace once the workspaces have loaded.
      if (await page.getByTestId("sidebar-sheet").count()) await page.getByTestId("workspace-header").waitFor();
      await page.evaluate(() => Promise.all([document.fonts.ready, ...document.getAnimations().map((x) => x.finished.catch(() => {}))]));
      const name = `${a.replace(/^#\//, "").replace(/[/?&=]/g, "-") || "home"}${phone ? "-phone" : ""}-${theme.replace("default-", "")}.png`;
      await page.screenshot({ path: resolve(out, name) });
      console.log(`shots/${name}`);
    }
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
