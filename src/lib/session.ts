import { create } from "zustand";

import { type Action, can } from "./permissions.ts";
import { clearCache } from "./resource-cache.ts";
import type { User } from "./types.ts";

// Who is signed in, for the page's life only: never in storage (a token
// belongs in an httpOnly cookie, or in memory through httpClient's headers
// hook; docs/decisions/0011-sessions.md). unknown until the first me() call
// answers; signed-out shows the sign-in view over everything (App.tsx), and
// a 401 from any call lands there too. Pure apart from its state, so
// session.test.ts runs it in node.

export type SessionStatus = "unknown" | "signed-in" | "signed-out";

// why says what ended the last session when the person didn't: "ended" is the
// server's time running out, which the sign-in page says.
export const useSession = create<{ status: SessionStatus; user?: User; why?: "ended" }>()(() => ({ status: "unknown" }));

// The other tabs (lib/tabs.ts sets this): told when this one signs in or out.
let tellTabs: (m: { type: "signed-out" } | { type: "signed-in" }) => void = () => {};
export function setTabsTeller(tell: typeof tellTabs) {
  tellTabs = tell;
}

// signedIn says who is signed in; o.tell is for a sign-in the person just
// made here, which the tabs on the sign-in page should look again at.
export function signedIn(user?: User, o: { tell?: boolean } = {}) {
  useSession.setState({ status: "signed-in", user });
  if (o.tell) tellTabs({ type: "signed-in" });
}

// useCan says whether the person signed in may take an action
// (lib/permissions.ts), and redraws when who that is changes.
export const useCan = (action: Action): boolean => useSession((s) => can(s.user, action));

// What the person who left leaves behind, besides what was read: their
// notices, counts, workspaces, Recent (lib/notifications.ts and the rest
// register here), so the next person on a shared machine sees none of it.
const forgetters = new Set<() => void>();
export function onSignedOut(forget: () => void) {
  forgetters.add(forget);
}

// signedOut forgets everything read for the person who left, here and, unless
// another tab is what said so, in every other tab.
export function signedOut(o: { fromOtherTab?: boolean; why?: "ended" } = {}) {
  const { status: was, user, why: before } = useSession.getState();
  // A 401 past the session's end is that end, whichever call met it first;
  // a late 401 after the sign-out keeps the reason it had.
  const why = o.why ?? (user?.sessionEndsAt && Date.parse(user.sessionEndsAt) <= Date.now() ? "ended" : was === "signed-out" ? before : undefined);
  clearCache();
  for (const forget of forgetters) forget();
  useSession.setState({ status: "signed-out", user: undefined, why });
  if (!o.fromOtherTab && was === "signed-in") tellTabs({ type: "signed-out" });
}
