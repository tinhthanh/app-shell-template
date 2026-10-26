// What a person may do, by their role: one table that the views ask (useCan,
// lib/session.ts) to leave out what isn't theirs to do, and that the mock
// (lib/mock.ts) enforces as a server would, with a 403. The server is the
// one that decides: hiding a button is a courtesy, not the check
// (docs/decisions/0012-permissions.md). Pure, so permissions.test.ts runs
// it in node.

import { t } from "./i18n.ts";
import type { Role, User } from "./types.ts";

// Each action, and the roles that may take it. A new action goes here, and
// a view asks for it by name.
export const ACTIONS = {
  "project.create": ["owner", "member"],
  "project.edit": ["owner", "member"],
  "project.delete": ["owner"],
  "workspace.create": ["owner", "member"],
} satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof ACTIONS;

// can says whether a person may take an action; nobody signed in may take none.
export function can(user: Pick<User, "role"> | undefined, action: Action): boolean {
  return Boolean(user && (ACTIONS[action] as readonly Role[]).includes(user.role));
}

// roleWords is a role in the language in use, for the account menu.
export const roleWords = (r: Role): string => t(`shell.role.${r}`);
