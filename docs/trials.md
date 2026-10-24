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

| 2026-10-18 | An Incidents area (severity and status, filters, sort, search, declare and edit with a severity choice, instant status, delete; sidebar and palette) and a Settings switch that hides resolved incidents by default | 8.5 | The example spec taught hand-built `page.goto` and 15 s timeouts; `NothingMatches` had no testid; the palette had no place for a second kind of record; changing only a Select in a `FormDialog` wasn't an edit (the agent fixed it); no example of a Select in a form; nothing said whether a default-filter setting or the address wins; the add-view skill didn't say a new place retakes every baseline; the loader's clock was 3.9:1 against the card (muted at 80%), seen by axe only when a slow run reached its second second (the "kit feedback" flake both this trial and #38 hit) | this PR |

| 2026-10-24 | A Customers area (thousands, paged; search, plan and status filters, three sorts; add and edit with a plan choice, instant status, owners alone delete; sidebar and palette; English and Vietnamese) and a Settings › Billing section choosing the currency | 8 | check-views read viewTitles off one line, so a fourth view (wrapped by the formatter) read as unwired; a scene was "ready" while its loader spun; About sat in Settings' list by position; a second `app.open` couldn't seed other prefs; no shared status badge (copied from projects); no Vietnamese glossary; no word on showing money; no way to take baselines without Docker; re-imports for coverage undocumented | this PR |

What is still open after the fifth trial: a sanctioned way to prove "feels instant" other than a 500 ms wait under `?slow=1`.

What was open after the fourth trial: a shared tone badge and option lists (views retype `bg-x/16 text-x-foreground` and parallel status arrays); a debounce for a list's search against a real API.

What was open after the third trial: a compact `ResourceView` for a
settings row; the UI's strings are English in the code (no i18n). The
`ListToolbar`/`DetailPage`/`removeRecord` extraction landed after it.
