// node --experimental-strip-types --test src/themes/contrast.test.ts (pnpm check:themes)
// Every built-in theme meets the contrast and the state colours contrast.ts
// asks of it. THEME_REPORT=1 prints each check's value.
import assert from "node:assert/strict";
import { test } from "node:test";

import { strong } from "./apply.ts";
import { builtinThemes } from "./builtin.ts";
import { contrast } from "./color.ts";
import { checks, failures } from "./contrast.ts";

const report = !!process.env.THEME_REPORT;

for (const theme of builtinThemes) {
  test(`${theme.name} is readable`, () => {
    if (report) for (const c of checks(theme)) console.log(`${theme.id}\t${c.what}\t${c.value.toFixed(2)}\t(min ${c.min})`);
    const bad = failures(theme).map((c) => `${c.what}: ${c.value.toFixed(2)}, wants ${c.min}`);
    assert.deepEqual(bad, []);
  });
}

test("white reads on every theme's destructive fill (a destructive button)", () => {
  for (const t of builtinThemes) assert.ok(contrast("#ffffff", strong(t.colors.destructive)) >= 4.5, t.id);
});

test("theme ids are unique", () => {
  const ids = builtinThemes.map((t) => t.id);
  assert.deepEqual(ids, [...new Set(ids)]);
});
