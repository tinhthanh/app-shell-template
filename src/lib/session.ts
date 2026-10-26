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

export const useSession = create<{ status: SessionStatus; user?: User }>()(() => ({ status: "unknown" }));

export function signedIn(user?: User) {
  useSession.setState({ status: "signed-in", user });
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

// signedOut forgets everything read for the person who left.
export function signedOut() {
  clearCache();
  for (const forget of forgetters) forget();
  useSession.setState({ status: "signed-out", user: undefined });
}
