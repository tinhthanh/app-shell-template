// node --experimental-strip-types --test src/lib/permissions.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIONS, type Action, can, ROLE_WORDS } from "./permissions.ts";
import { ROLES } from "./types.ts";

test("an owner may do everything, a member everything but delete, a viewer nothing", () => {
  const all = Object.keys(ACTIONS) as Action[];
  assert.deepEqual(
    all.filter((a) => can({ role: "owner" }, a)),
    all,
  );
  assert.deepEqual(
    all.filter((a) => can({ role: "member" }, a)),
    ["project.create", "project.edit"],
  );
  assert.deepEqual(
    all.filter((a) => can({ role: "viewer" }, a)),
    [],
  );
});

test("nobody signed in may take any action", () => {
  assert.equal(can(undefined, "project.create"), false);
});

test("every role has its words, and every action names only known roles", () => {
  assert.deepEqual(Object.keys(ROLE_WORDS), [...ROLES]);
  for (const roles of Object.values(ACTIONS)) for (const r of roles) assert.ok((ROLES as readonly string[]).includes(r));
});
