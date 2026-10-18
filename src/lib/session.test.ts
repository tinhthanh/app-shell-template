// node --experimental-strip-types --test src/lib/session.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { cached, remember } from "./resource-cache.ts";
import { signedIn, signedOut, useSession } from "./session.ts";

test("the session starts unknown, is signed in with the person, and signing out forgets what was read", () => {
  assert.equal(useSession.getState().status, "unknown");
  signedIn({ id: "u-1", name: "Alex", email: "alex@acme.test", role: "owner" });
  assert.deepEqual(useSession.getState(), { status: "signed-in", user: { id: "u-1", name: "Alex", email: "alex@acme.test", role: "owner" } });
  remember("projects", [1]);
  signedOut();
  assert.deepEqual(useSession.getState(), { status: "signed-out", user: undefined });
  assert.equal(cached("projects"), undefined);
});
