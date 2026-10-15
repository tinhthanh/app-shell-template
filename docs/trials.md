# Fresh-agent trials

How the template is measured: a fresh agent is given a product task in a
worktree with the repo as its only source, and a second agent scores the
result against the repo's rules (`.claude/skills/trial`). Each deviation is
a template bug first. The scores:

| Date | Task | Score | What the template got wrong | Fixed in |
|---|---|---|---|---|
| 2026-10-14 | A first look: copy the template, follow "Make it yours" | 7.5 | The recipes left gaps a fresh reader fell into; no runtime config; no sign-in; no URL filters | #19–#23 |
| 2026-10-15 | A Tickets area (list sorted and filtered, detail, status change, create, delete; sidebar and palette) | 8 | "Copy `views/projects/`" meant the whole view was copied; a refusal named no field; the fixture had no `hash`; nothing asked for the task's open questions to be stated | #28, #29 |
| 2026-10-15 | A Members area (invite with email and role, change role, remove) and a Settings "Team" section with a remembered switch | 9 | `pnpm shots` took blank pictures; three copies of the search box; the template's own axe scenes built addresses by hand; the add-view skill contradicted AGENTS.md; the startup budget had 5 KB left | #30, #31 |

What is still open after the third trial: a `ListToolbar`/`DetailPage` so
a new resource view is columns, fields and words only; a compact
`ResourceView` for a settings row; the UI's strings are English in the
code (no i18n).
