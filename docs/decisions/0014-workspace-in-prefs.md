# 0014: The workspace on show is a preference, not part of the address

**Status:** accepted, 2026-10-26

**Context.** Projects belong to a workspace, and the rail switches between
them. The workspace could live in the hash (`#/w/acme/projects`) or in the
saved preferences, beside the sidebar's width and Recent.

**Decision.** `prefs.workspace` holds the workspace on show
(`lib/workspace.ts`: `useWorkspaceId`, `pickWorkspace`), and the address
stays `#/projects/<id>`. A project's id is enough to find it, so a link to
one opens it whichever workspace is picked, and the projects view switches
to the project's own workspace when it is one of the person's
(`projects-view.tsx`); when it isn't, the server refuses it with a 403
and the page says it isn't theirs to see (Forbidden, `components/not-here.tsx`;
the mock's `p-vault`). Signing
out forgets the pick and Recent (`onSignedOut` in `lib/session.ts`), so
the next person starts in their own first workspace.

**Consequences.** Links stay short and don't break when a workspace is
renamed. Each tab keeps the pick it loaded with until it reloads (prefs
aren't synced between tabs), and the last one saved wins. A list's link carries its filters, not its
workspace: shared with someone in another workspace, it opens on theirs.

**Revisit if.** Records' ids are only unique within a workspace, or people
keep two workspaces open side by side in tabs; then the workspace goes in
the address (`routes.ts`), first segment, and the pref only remembers the
last one.
