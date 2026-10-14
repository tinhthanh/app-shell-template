import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// commit is the checkout's short hash, shown in Settings › About; empty
// outside a git checkout.
function commit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: import.meta.dirname, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// appVersion is package.json's version.
function appVersion(): string {
  return JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "package.json"), "utf8")).version;
}

// startupChunks puts all the code the app starts with in two files: the
// libraries and the app's own. Left to itself the bundler cuts it into
// hundreds (lucide's icons one file each), and the window waits on every
// one before its first paint. What loads later (lib/lazy-view.tsx) is
// split as before.
const startupChunks = {
  groups: [
    { name: "vendor", test: /[\\/]node_modules[\\/]/, tags: ["$initial" as const] },
    { name: "startup", tags: ["$initial" as const] },
  ],
};

// A second dev server (another --port) keeps its own prebundled deps: one
// cache re-bundled under a running server gives its page two copies of a
// library's internals, and Base UI's contexts stop matching.
const argPort = process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : undefined;
const devPort = Number(process.env.PORT ?? 1420);

export default defineConfig(() => ({
  cacheDir: argPort && Number(argPort) !== devPort ? `node_modules/.vite-${argPort}` : "node_modules/.vite",
  plugins: [react(), tailwindcss()],
  define: { __APP_COMMIT__: JSON.stringify(commit()), __APP_VERSION__: JSON.stringify(appVersion()) },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: { output: { codeSplitting: startupChunks } },
  },
  clearScreen: false,
  server: {
    port: devPort,
    strictPort: true,
  },
}));
