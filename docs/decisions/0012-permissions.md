# 0012: What a person may do is one table, asked by name

**Status:** accepted, 2026-10-18

**Context.** Most apps built from the template have people who may read
but not change, or change but not delete. Left to each view, the checks
end up as `user.role === "owner"` scattered through components, out of
step with each other and with the server.

**Decision.** `User` has a `role` (`owner`, `member`, `viewer`).
`lib/permissions.ts` has one table, `ACTIONS`, from each action
(`"project.delete"`) to the roles that may take it, and `can(user,
action)`. A view asks `useCan("project.delete")` (lib/session.ts) and
leaves out what the person may not do: the button isn't there, and a
control that would write is shown as plain text. The mock (`?role=viewer`,
`?role=member`) enforces the same table as a server would, with a 403
(`code: "forbidden"`), which `explain()` already words as "You can't do
that".

**Consequences.** The server is the check; hiding is a courtesy, so a
view never relies on it. A server must send `role` with `me()`; one with
no roles answers `"owner"`. A new action is a line in `ACTIONS` and a
`useCan` where it is offered. A role the table doesn't know may do nothing.

**Revisit if.** Permissions depend on the record (the project's own
owner may delete it, nobody else): then `can(user, action, record)` asks
the record's own fields, or the server sends what the person may do with
each record (`"actions": ["edit"]`) and the table goes.
