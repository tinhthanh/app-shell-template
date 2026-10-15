// The screenshot comparison (e2e/visual.spec.ts) on a Mac or Windows
// machine: its baselines are Linux renderings (CI's), so it runs in the
// Playwright Linux image, on this checkout's build. Docker is needed.
//
//   pnpm test:visual              compare
//   pnpm test:visual --update     write new baselines (commit them)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(readFileSync(resolve(root, "node_modules/@playwright/test/package.json"), "utf8")).version;
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const update = process.argv.includes("--update");

const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" }).status ?? 1;
if (process.platform === "linux") {
  process.exit(run("node_modules/.bin/playwright", ["test", "e2e/visual.spec.ts", ...(update ? ["--update-snapshots"] : [])]));
}
if (run("node_modules/.bin/vite", ["build"]) !== 0) process.exit(1);
if ((spawnSync("docker", ["image", "inspect", image], { stdio: "ignore" }).status ?? 1) !== 0) {
  console.log(`visual: pulling ${image} (once; it is large)`);
  if (run("docker", ["pull", image]) !== 0) process.exit(1);
}
// The checkout is mounted as it is; node_modules is the Mac's, which the
// test runner (JavaScript) is fine with. E2E_SERVE=static: the server is
// scripts/serve-dist.mjs, not vite preview.
process.exit(
  run("docker", [
    "run",
    "--rm",
    "--init",
    "--ipc=host",
    "-v",
    `${root}:/work`,
    "-w",
    "/work",
    "-e",
    "E2E_SERVE=static",
    "-e",
    "VISUAL=1",
    "-e",
    "E2E_PORT=1430",
    image,
    "node",
    "node_modules/@playwright/test/cli.js",
    "test",
    "e2e/visual.spec.ts",
    ...(update ? ["--update-snapshots"] : []),
  ]),
);
