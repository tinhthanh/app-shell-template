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
  assert.deepEqual(useSession.getState(), { status: "signed-out", user: undefined, why: undefined });
  assert.equal(cached("projects"), undefined);
});

test("a sign-out past the session's end says it ended, whichever call met it; an earlier one doesn't", () => {
  signedIn({ id: "u-1", name: "Alex", email: "alex@acme.test", role: "owner", sessionEndsAt: new Date(Date.now() - 1000).toISOString() });
  signedOut();
  assert.equal(useSession.getState().why, "ended");
  // A call that meets the 401 later keeps the reason.
  signedOut();
  assert.equal(useSession.getState().why, "ended");
  signedIn({ id: "u-1", name: "Alex", email: "alex@acme.test", role: "owner", sessionEndsAt: new Date(Date.now() + 60_000).toISOString() });
  signedOut();
  assert.equal(useSession.getState().why, undefined);
});
