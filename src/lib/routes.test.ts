// node --experimental-strip-types --test src/lib/routes.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { hashToView, viewToHash } from "./routes.ts";

test("every view has an address, and the address reads back to the view", () => {
  for (const v of [
    { kind: "home" },
    { kind: "projects" },
    { kind: "projects", id: "p-shop" },
    { kind: "kit" },
    { kind: "kit", section: "buttons" },
    { kind: "settings" },
    { kind: "settings", section: "appearance" },
  ] as const) {
    assert.deepEqual(hashToView(viewToHash(v)), v);
  }
});

test("an id with odd characters survives the round trip", () => {
  const v = { kind: "projects", id: "a b/c?d#e" } as const;
  assert.deepEqual(hashToView(viewToHash(v)), v);
});

test("an address the app doesn't know is Home; an unknown settings section is Settings", () => {
  assert.deepEqual(hashToView("#/nowhere"), { kind: "home" });
  assert.deepEqual(hashToView("#/settings/nope"), { kind: "settings" });
  assert.deepEqual(hashToView(""), { kind: "home" });
  assert.deepEqual(hashToView("#/"), { kind: "home" });
  assert.deepEqual(hashToView("#projects"), { kind: "projects" });
});
