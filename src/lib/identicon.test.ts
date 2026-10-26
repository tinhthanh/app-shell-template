// node --experimental-strip-types --test src/lib/identicon.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { identicon } from "./identicon.ts";

test("a name's pattern is the same every time, mirrored, and never empty", () => {
  const a = identicon("Acme");
  assert.deepEqual(identicon(" acme "), a);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 2; col++) assert.equal(a.cells[row * 5 + col], a.cells[row * 5 + (4 - col)]);
  for (const name of ["", "x", "Globex", "Initech"]) assert.ok(identicon(name).cells.filter(Boolean).length >= 5, name);
  assert.ok(a.hue >= 0 && a.hue < 360);
  assert.notDeepEqual(identicon("Globex").cells, a.cells);
});
