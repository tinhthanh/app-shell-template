// node --test scripts/check-file.test.mjs (pnpm test)
// The edit hook's checks (check-file.mjs) on one file: each case writes a
// probe into src/views/, where every check reads, and takes it away after.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "..");

// probe writes `text` to a file of its own under src/views/ and runs the
// check on it; the file is gone when the test ends.
function probe(t, text) {
  const file = resolve(root, `src/views/check-file-probe-${process.pid}-${Math.random().toString(36).slice(2)}.tsx`);
  writeFileSync(file, text);
  t.after(() => rmSync(file, { force: true }));
  const r = spawnSync(process.execPath, [resolve(root, "scripts/check-file.mjs"), file], { cwd: root, encoding: "utf8" });
  return { status: r.status, said: r.stderr, file };
}

test("a file that keeps the rules passes, and comes back formatted", (t) => {
  const r = probe(t, 'export const probe   = "p";\n');
  assert.equal(r.status, 0, r.said);
  assert.equal(readFileSync(r.file, "utf8"), 'export const probe = "p";\n');
});

test("a raw text size, a physical side and an English word are each named with their line", (t) => {
  const r = probe(t, 'export function Probe() {\n  return <div className="ml-2 text-sm">Hello there</div>;\n}\n');
  assert.equal(r.status, 1);
  assert.match(r.said, /physical side/);
  assert.match(r.said, /check-file-probe-[\w-]+\.tsx:2\s+text-sm/);
  assert.match(r.said, /check-file-probe-[\w-]+\.tsx:2\s+"Hello there"/);
});

test("a title on a button is named", (t) => {
  const r = probe(t, 'export function Probe() {\n  return <button type="button" title="x" aria-label="x" />;\n}\n');
  assert.equal(r.status, 1);
  assert.match(r.said, /<button title=…>\s+\(interactive\)/);
});

test("a bar off the grid is named", (t) => {
  const r = probe(t, 'export function Probe() {\n  return <div className="h-12 border-b" />;\n}\n');
  assert.equal(r.status, 1);
  assert.match(r.said, /h-12 on a bar/);
});

test("a file outside the repository, or not code, is left alone", () => {
  for (const file of ["/dev/null", resolve(root, "README.md"), resolve(root, "src/views/no-such-file.tsx")]) {
    const r = spawnSync(process.execPath, [resolve(root, "scripts/check-file.mjs"), file], { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, `${file}: ${r.stderr}`);
  }
});
