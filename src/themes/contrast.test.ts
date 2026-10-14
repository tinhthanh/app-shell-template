// node --experimental-strip-types --test src/themes/contrast.test.ts (pnpm check:themes)
// Every built-in theme meets the contrast and the state colours contrast.ts
// asks of it. THEME_REPORT=1 prints each check's value.
import assert from "node:assert/strict";
import { test } from "node:test";

import { strong } from "./apply.ts";
import { builtinThemes } from "./builtin.ts";
import { contrast, distance } from "./color.ts";
import { checks, failures } from "./contrast.ts";
import { stateColours, TONE_APART, TONE_TEXT, TONES, toneChecks, toneColors } from "./tones.ts";

const report = !!process.env.THEME_REPORT;

for (const theme of builtinThemes) {
  test(`${theme.name} is readable`, () => {
    if (report) for (const c of checks(theme)) console.log(`${theme.id}\t${c.what}\t${c.value.toFixed(2)}\t(min ${c.min})`);
    const bad = failures(theme).map((c) => `${c.what}: ${c.value.toFixed(2)}, wants ${c.min}`);
    assert.deepEqual(bad, []);
  });
}

// The six tones (tones.ts) on every theme: text that reads on the page, the
// sidebar and their own wash, and clear of the state colours.
for (const theme of builtinThemes) {
  test(`tones read on ${theme.name} and keep clear of its state colours`, () => {
    const tones = toneColors(theme);
    const bad: string[] = [];
    for (const tone of TONES) {
      for (const c of toneChecks(tones[tone], theme)) if (c.value < TONE_TEXT) bad.push(`${tone} ${c.what}: ${c.value.toFixed(2)}`);
      for (const s of stateColours(theme)) if (distance(tones[tone], s) < TONE_APART) bad.push(`${tone} too close to ${s}`);
    }
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
