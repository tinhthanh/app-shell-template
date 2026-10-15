// The Content Security Policy in deploy/csp.txt allows exactly one inline
// script: the one in index.html that sets the appearance before the first
// paint, by its SHA-256. Editing that script changes the hash, so this check
// recomputes it and fails when deploy/csp.txt is behind, printing the line
// to put there.
//
//   node scripts/check-csp.mjs
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const csp = await readFile(resolve(root, "deploy/csp.txt"), "utf8");

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (inline.length !== 1) {
  console.error(`check-csp: index.html has ${inline.length} inline scripts; the CSP allows exactly one (the appearance script)`);
  process.exit(1);
}
const hash = `'sha256-${createHash("sha256").update(inline[0]).digest("base64")}'`;
if (!csp.includes(hash)) {
  console.error(`check-csp: deploy/csp.txt does not name the inline script's hash.\n  The script changed; put this in script-src:\n  ${hash}`);
  process.exit(1);
}
// Nothing weaker than the policy the docs promise.
for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "*"]) {
  if (new RegExp(`(script-src|style-src|default-src)[^;]*\\s${bad.replace(/[*']/g, "\\$&")}(\\s|;|$)`).test(csp)) {
    console.error(`check-csp: deploy/csp.txt allows ${bad}; the app does not need it`);
    process.exit(1);
  }
}
console.log(`check-csp: the inline script is ${hash.slice(0, 20)}…, named in deploy/csp.txt`);
