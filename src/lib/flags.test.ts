// node --experimental-strip-types --test src/lib/flags.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { FLAGS, flag, flagsFrom, setFlags } from "./flags.ts";

test("a flag is its default until config.js or, with the knobs on, the URL says otherwise", () => {
  assert.equal(flagsFrom({}, "", false).gettingStarted, FLAGS.gettingStarted.on);
  assert.equal(flagsFrom({ flags: { gettingStarted: false } }, "", false).gettingStarted, false);
  assert.equal(flagsFrom({ flags: { gettingStarted: false } }, "?flags=gettingStarted", true).gettingStarted, true);
  assert.equal(flagsFrom({}, "?flags=-gettingStarted", true).gettingStarted, false);
});

test("a production build ignores the URL, and a name that isn't a flag or isn't a yes or no is ignored", () => {
  assert.equal(flagsFrom({}, "?flags=-gettingStarted", false).gettingStarted, true);
  const f = flagsFrom({ flags: { nope: true, gettingStarted: "no" as unknown as boolean } }, "?flags=alsoNope", true);
  assert.deepEqual(Object.keys(f), Object.keys(FLAGS));
  assert.equal(f.gettingStarted, true);
});

test("flag reads what was set at start, and its default before", () => {
  assert.equal(flag("gettingStarted"), true);
  setFlags({ gettingStarted: false });
  assert.equal(flag("gettingStarted"), false);
  setFlags({ gettingStarted: true });
});
