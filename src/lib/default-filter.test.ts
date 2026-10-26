// node --experimental-strip-types --test src/lib/default-filter.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { withDefault } from "./default-filter.ts";

type V = { kind: "tasks"; done?: "show" | "hide"; status?: string; q?: string };

test("a list opened with no say in its address gets the setting's value written in", () => {
  assert.deepEqual(withDefault<V, "done">({ kind: "tasks", q: "tax" }, "done", "hide"), { kind: "tasks", q: "tax", done: "hide" });
});

test("the address wins: a filter it names, or one that overrides the setting, is left as it is", () => {
  assert.equal(withDefault<V, "done">({ kind: "tasks", done: "show" }, "done", "hide"), undefined);
  assert.equal(withDefault<V, "done">({ kind: "tasks", status: "done" }, "done", "hide", ["status"]), undefined);
});

test("a setting that is off writes nothing", () => {
  assert.equal(withDefault<V, "done">({ kind: "tasks" }, "done", undefined), undefined);
});
