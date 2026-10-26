// node --experimental-strip-types --test src/lib/whats-new.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, latestRelease } from "./whats-new.ts";
import { WHATS_NEW } from "./whats-new-notes.ts";

const releases = [
  { version: "0.1.0", notes: ["a"] },
  { version: "0.2.0", notes: ["b"] },
  { version: "0.10.0", notes: ["c"] },
];

test("the newest notes are the highest version by number, not by text", () => {
  assert.equal(latestRelease(releases)?.version, "0.10.0");
});

test("a first run shows nothing; an update shows the newest release it includes, once", () => {
  assert.deepEqual(decide({ firstRun: true, seen: null, current: "0.2.0", releases }), { seen: "0.2.0" });
  const d = decide({ firstRun: false, seen: "0.1.0", current: "0.2.0", releases });
  assert.equal(d.show?.version, "0.2.0");
  assert.equal(d.seen, "0.2.0");
  // Seen already: nothing.
  assert.equal(decide({ firstRun: false, seen: "0.2.0", current: "0.2.0", releases }).show, undefined);
  // Prefs from before the dialog: an update.
  assert.equal(decide({ firstRun: false, seen: undefined, current: "0.2.0", releases }).show?.version, "0.2.0");
  // A dev build older than what was seen never moves seen back.
  assert.equal(decide({ firstRun: false, seen: "0.10.0", current: "0.2.0", releases }).seen, "0.10.0");
});

test("the app's own notes are well-formed and name the current version's lineage", () => {
  for (const r of WHATS_NEW) {
    assert.match(r.version, /^\d+\.\d+\.\d+$/);
    assert.ok(r.notes.length > 0, `${r.version} has notes`);
  }
});
