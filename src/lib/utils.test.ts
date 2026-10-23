// node --experimental-strip-types --test src/lib/utils.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { cn, TYPE_SCALE } from "./utils.ts";

test("a size on the type scale sits beside a colour, as a size and a colour do", () => {
  assert.equal(cn("text-desc text-muted-foreground"), "text-desc text-muted-foreground");
  for (const size of TYPE_SCALE) assert.equal(cn(`text-${size}`, "text-foreground"), `text-${size} text-foreground`);
});

test("a later size replaces an earlier one, whether raw or on the scale", () => {
  assert.equal(cn("text-body", "text-meta"), "text-meta");
  assert.equal(cn("text-sm", "text-tag"), "text-tag");
});

test("the density sizes replace a spacing they stand for", () => {
  assert.equal(cn("h-8", "h-row"), "h-row");
});
