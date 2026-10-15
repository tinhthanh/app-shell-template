// Serves dist/ as the browser suite's server where vite preview cannot run:
// inside the Playwright Linux image (scripts/visual.mjs), whose node has no
// Linux build of the bundler. Static files only, which is all the built app
// is (hash routing); nothing else is served.
//
//   node scripts/serve-dist.mjs 1430
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../dist");
const port = Number(process.argv[2] ?? 1430);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, "0.0.0.0", () => console.log(`serve-dist: http://localhost:${port}/`));
