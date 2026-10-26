// node --test scripts/deploy.test.mjs (pnpm test)
// The container's start script (deploy/entrypoint.sh), run against a
// scratch folder: what it writes for nginx and the page, and what it refuses.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");

function start(env) {
  const dir = mkdtempSync(join(tmpdir(), "entrypoint-"));
  const conf = join(dir, "security.conf");
  copyFileSync(join(root, "deploy/security.conf"), conf);
  const r = spawnSync("sh", [join(root, "deploy/entrypoint.sh")], { env: { PATH: process.env.PATH, HTML_DIR: dir, SECURITY_CONF: conf, ...env }, encoding: "utf8" });
  const read = (f) => readFileSync(join(dir, f), "utf8");
  return { status: r.status, stderr: r.stderr, config: () => read("config.js"), conf: () => read("security.conf") };
}

test("the API's origin goes in the CSP's connect-src, and its URL in config.js", () => {
  const r = start({ API_URL: "https://api.acme.example/v1" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.conf(), /connect-src 'self' https:\/\/api\.acme\.example;/);
  assert.doesNotMatch(r.conf(), /__API_ORIGIN__/);
  assert.equal(r.config().trim(), 'window.__APP_CONFIG__ = { apiUrl: "https://api.acme.example/v1", mock: false };');
});

test("the fixtures need no API, and the CSP then allows only this origin", () => {
  const r = start({ MOCK: "1" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.conf(), /connect-src 'self' ;/);
  assert.match(r.config(), /mock: true/);
});

test("it refuses to start with no API, or with anything but a plain http(s) URL", () => {
  assert.equal(start({}).status, 1);
  for (const bad of ['https://x.test/"};alert(1);//', "javascript:alert(1)", "https://x.test/ evil", "ftp://x.test"]) {
    const r = start({ API_URL: bad });
    assert.equal(r.status, 1, bad);
    assert.match(r.stderr, /must be an http\(s\) URL/);
  }
});

test("the error and usage collectors go in config.js, and their origins, once each, in connect-src", () => {
  const r = start({ API_URL: "https://api.acme.example/v1", REPORT_URL: "https://errors.acme.example/in", ANALYTICS_URL: "https://api.acme.example/usage" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.conf(), /connect-src 'self' https:\/\/api\.acme\.example https:\/\/errors\.acme\.example;/);
  assert.equal(
    r.config().trim(),
    'window.__APP_CONFIG__ = { apiUrl: "https://api.acme.example/v1", mock: false, reportUrl: "https://errors.acme.example/in", analyticsUrl: "https://api.acme.example/usage" };',
  );
});

test("a collector's URL is held to the same rule as the API's", () => {
  const r = start({ MOCK: "1", REPORT_URL: 'https://x.test/"};alert(1);//' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /REPORT_URL must be an http\(s\) URL/);
});
