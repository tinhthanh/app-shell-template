# Working on this app

A frontend-only React app: Vite 8, React 19, Tailwind 4, coss ui on Base
UI, zustand, Playwright. There is no backend here; the views read through
`src/lib/api.ts`, which runs on the fixtures in `src/lib/mock.ts` unless
`VITE_API_URL` is set. `docs/architecture.md` has the map and the
vocabulary; `docs/decisions/` has why things are the way they are; the
skills in `.claude/skills/` walk through each recipe step by step
(`add-view`, `add-resource`, `add-form`, `add-setting`, `add-shortcut`,
`add-theme`, `e2e-tests`, `open-pr`, `fix-ci`, `release`, `trial`), and
the `reviewer` agent (`.claude/agents/reviewer.md`) reads a diff against
these rules before a PR.

## Tooling

- `pnpm install` points git at `.githooks/`: pre-commit formats what's
  staged in place and re-stages it, lints, and checks titles; commit-msg
  checks the subject; pre-push runs `pnpm check`. Never `--no-verify`: CI
  runs the same and more. Edits made from a shell aren't formatted by the
  editor hook, so run `pnpm format` before you look at a diff.
- `pnpm check` builds into `node_modules/.check-dist`, never `dist/`,
  so it can run while a browser suite serves `dist/`. Two `test:e2e` runs
  at once still share `dist/`: run them one after the other.
- Claude Code reads `.claude/settings.json`: a Stop hook runs `pnpm check`
  when the tree has changes and, while it is red, blocks the first stop
  with its last lines (a second stop goes through, so a check that cannot
  pass doesn't loop); after each Edit/Write, and after a shell command on
  each file it changed (`.claude/hooks/around-bash.mjs`), `scripts/check-file.mjs`
  formats the file and checks it alone (Biome's errors, titles, words,
  type sizes, the grid), and what it finds comes back at once: fix it
  before the next edit. Force pushes, pushes to `main`, `pkill` and
  killing port 1420 are refused.

- A session opened in another repository (a server's, working on both) runs that repository's
  hooks, not these: after each file you write here, run `node scripts/check-file.mjs <file>`,
  which is what the edit hook would have run, or open a session in this repository for its side.
- Node 22 (`.nvmrc`) and pnpm 11 (`packageManager`). If `pnpm` is not on
  your PATH, run it as `npx pnpm@11` (or `corepack enable` on Node 22–24).
- Chromium for the browser tests, once: `pnpm exec playwright install --with-deps chromium`.

## Checks

Run these before you call something done, and paste their last lines in
the PR:

```sh
pnpm check                                   # typecheck, lint, check:titles, check:words, check:type, check:grid, check:node, check:views, check:csp, check:contract, check:themes, test, build, check:size
pnpm test:coverage                           # the node-run modules: lines 90%, branches and functions 80% (CI runs it)
pnpm test:e2e e2e/x.spec.ts                  # the specs you touched: builds first, then Playwright on a free port
pnpm test:e2e e2e/x.spec.ts --repeat-each=5  # before calling a flake fixed
pnpm shots '#/x'                             # a UI change: the pictures in shots/; open them and look (--phone for 375 wide)
pnpm test:visual                             # when the look changed: the screenshots against e2e/snapshots/ (Docker on a Mac)
pnpm test:visual --update                    # …and the new baselines, committed with the change
node scripts/take-ci-baselines.mjs           # no Docker: after a push, CI's own renderings and their diffs; --take writes them
pnpm ci:local                                # last, before the push: what CI runs, on a clean copy of HEAD, the browser suite in Linux
pnpm verify                                  # where CI runs locally (CI_MODE=local): ci:local, then the reviewer agent's verdict, recorded in evidence/
```

`pnpm ci:local` (`scripts/ci-local.mjs`) is CI on this machine: the app
job's steps read from `ci.yml`, on a worktree of HEAD with a frozen install
and `CI=true`, the whole browser suite in the Playwright Linux image on two
CPUs, as CI's runner (Docker; start it first), then the evidence and
guardrails gates on the branch's PR (or `PR_TITLE`, `PR_BODY`, `PR_LABELS`
before it exists). Its summary is the one to paste. It finds what a run
here doesn't: a file you never added, a lockfile not updated, and the races
that show only on a slower Linux machine (a test green here and red on CI
is one of those: run it in Linux, not again here). A push with `ci:local`
red, or not run, learns the same thing seven minutes later.

Where Actions minutes cost (a private repository on a free plan; the
repository variable `CI_MODE=local`, which `node scripts/setup-repo.mjs`
sets there), CI skips the app job, and `pnpm verify` is it: `ci:local`,
then the `reviewer` agent on the diff (`claude -p`, read-only), its answer
in `evidence/review.md` and the run in `evidence/verify.json`. Commit
`evidence/` and push: the pre-push hook and CI's evidence job refuse a
head whose tree has no green run with the verdict "ready" (`pnpm check:proof`,
ADR 0017). `gh variable get CI_MODE` says which this repository is. There,
Docker is needed: nothing else draws the pictures, so a run without it is
no proof, and the baselines are taken with `pnpm test:visual --update`.

With no Docker (or one that doesn't answer), push: CI renders the
pictures on Linux, fails the ones the change moved and keeps each
`-actual.png` and `-diff.png`. `node scripts/take-ci-baselines.mjs` fetches
them for your branch and lists the diffs; look at every one, then
`--take` copies them over `e2e/snapshots/`, and you commit them. Say in
the PR that the baselines are CI's and what each diff shows.

With neither (no Docker, and you may not push, as in a trial): make every
change the pictures need all the same (the `e2e/scenes.json` scene of a new
view included), and list under Not done each baseline that moves and why
("a new place on the rail: every desktop picture"). Whoever pushes takes
them from CI as above; nothing else is left undone for want of them.

While you chase a failure, run only that test: its file and line
(`e2e/a11y.spec.ts:150`) or `--grep "its title"`, and `--repeat-each` on
it alone. The whole browser suite, and `A11Y_FULL=1` on all of axe, take
minutes a run: run them once, before you commit, not after each guess. A
failure that isn't yours and that two guesses haven't explained is a note
in the PR with its proof (Done means, 2) and an issue, not the rest of
your afternoon.

`pnpm exec playwright test` alone serves whatever is in `dist/`, which is
the build from before your change: always go through `test:e2e`, which
builds. CI (`.github/workflows/ci.yml`) runs all of it, the whole browser
suite included: Playwright runs in Default Dark (`playwright.config.ts`),
axe adds Default Light (`A11Y_FULL=1`), and the visual scenes are taken in
both.

## Done means

1. `pnpm check` is green, the specs for what you touched pass, and before
   the push `pnpm ci:local` is green (with Docker; without it, the PR says so),
   or `pnpm verify`, its `evidence/` committed, where `CI_MODE=local`.
2. Every behaviour you changed has a test that proves it (the table below),
   named in the PR. A bug fix has a test that failed before the fix. A
   failure you say isn't yours ("it fails on main too") comes with its
   proof: the run on `main` (a CI link, or the command and its last lines).
3. A UI change that alters a scene in `e2e/scenes.json` updates its
   baselines (`pnpm test:visual --update`, or CI's through
   `node scripts/take-ci-baselines.mjs --take`), and the PR shows them.
4. A UI change has a screenshot in Default Dark and Default Light
   (`pnpm shots` writes them to `shots/`; `--phone` at a phone's width),
   which you have opened and looked at: a clipped label, a lost margin or a
   row that wraps passes every test. Its axe scene is updated; a
   new kit component gets a Kit section, a new view or settings section an
   axe scene.
5. A user-visible change has a bullet under `## Unreleased` in `CHANGELOG.md`.
6. No new `test.skip`, `test.fixme` or `test.only` at all (CI refuses them
   outright, `scripts/check-guardrails.mjs`), no `@ts-ignore` or
   `@ts-expect-error`, a `biome-ignore` only as `biome-ignore lint/<rule>: <reason>`
   (a reason of 15 characters or more), and no `ALLOW` entry without a reason beside it.
7. The work is on a branch, as a PR against `main`, with a lowercase
   conventional subject (`feat: …`, `fix: …`, `test: …`, `docs: …`,
   `ci: …`, `chore: …`) that says what the user gets. The PR template's
   Proof section is filled in; a `feat:` says under Assumptions what the
   task left open and you decided, and under Not done what you left out
   (CI refuses a `feat:` without them).

CI holds you to this, and when it fails it says what in one comment on
the PR (the failed tests by name, with the command to run them) and in
the job summary. The `evidence` job refuses a change under `src/`
with no changed test (write `no-test: <why>` in the PR body when none is
possible, the why in 15 characters or more) and a user-visible change with no changelog bullet; the
`guardrails` job refuses `test.skip`, `test.fixme`, `test.only`,
`@ts-ignore`, `@ts-expect-error`, a `biome-ignore` without a rule and a reason, and any edit to the checks,
configs or these rules without the `guardrail-change` label.

## Which test proves it

| You changed | The proof |
|---|---|
| Pure logic in `src/lib/*.ts` or `src/themes/*.ts` | A `*.test.ts` beside it, run by node (see "Node-run modules") |
| A view | Its round trip in `src/lib/routes.test.ts`, a scene in `e2e/a11y.spec.ts`, a scene in `e2e/scenes.json` (its baselines), a behaviour test in an e2e spec |
| A setting | A `prefs.test.ts` case (default, and the migration when `PREFS_VERSION` moves), and `e2e/settings.spec.ts` showing it persists (`app.stored("app.prefs")`) |
| A shortcut | `src/lib/keys.test.ts` (the press reaches it), and `e2e/shell.spec.ts` pressing it with the `mod` helper |
| A resource, or a view that reads | `src/lib/mock.test.ts` and `src/lib/api.test.ts`, `pnpm check:contract` (the client and the mock against `api/openapi.json`), and an e2e spec for loading, failed and empty through `?slow=1`, `?fail=1`, `?empty=1` (`<ResourceView testid="x">` names them `x-loading`, `x-failed`, `x-empty`; `x-missing`, `x-forbidden` for a 404 and a 403; `x-stale` for a reload that failed over rows already shown) |
| A UI-kit component | A section on the Kit page (axe checks it in both appearances) |
| A theme | `pnpm check:themes` |
| Component behaviour (focus, dialogs, layout) | An e2e spec. There is no DOM test runner here, and we don't add one: Playwright on the real build is the proof |

## Rules

- **Ports:** 1420 is the dev server. `pnpm test:e2e` and `pnpm shots` take
  the first free port in 1421–1439 (`scripts/free-port.mjs`), so runs in
  two worktrees don't meet; `E2E_PORT` picks one by hand.
- **Kill only PIDs you started.** No `pkill node`, `pkill vite` or the like.
- **No `title=`** on anything interactive or that carries meaning (an icon,
  a badge); use `<Tip>`. Plain truncated text may keep one (`check:titles`).
- **Fixtures are synthetic** ("acme"). Nothing real goes in `src/lib/mock.ts`.
- **No secrets** in code, URLs or logs. Configuration goes through `VITE_*`
  env vars at build (`.env.example`) or the host's `config.js` at run time
  (`src/lib/config.ts`).
- **Sides are logical:** `start`/`end`, `ps`/`pe`, `ms`/`me`, `border-s`/`border-e`,
  `text-start`/`text-end`, never `left`/`right` (a Biome plugin refuses them
  outside the kit), so `?dir=rtl` mirrors the whole app.
- **Density and tokens:** rows use `h-row`/`py-row-pad`/`h-side-row`;
  colours use the theme's tokens or a tone, never a hard-coded hex or a
  Tailwind palette class.
- **Bars and gutters are on the grid** (`src/index.css`, "The layout
  grid"): a top band is `h-bar`, a full page's gutter `px-page`, a column's
  boxes start at `px-edge` and their content at `px-lane`, never `h-12` on
  a bar or `ps-[11px]` (`pnpm check:grid`; a deliberate exception says why
  in a `grid-ok:` comment).
- **Text is sized by its role** on the type scale (`src/index.css`):
  `text-page-title`, `text-title`, `text-heading`, `text-subtitle`, `text-body`, `text-row`, `text-desc`,
  `text-section`, `text-label`, `text-meta`, `text-tag`, `text-mono`, never
  `text-sm`, `text-xs` or `text-[13px]` (`pnpm check:type`; the UI kit in
  `components/ui` keeps its own). Text drawn as a picture says why in a
  `type-ok:` comment.
- **Words go through `t()`** (`src/lib/i18n.ts`, `docs/decisions/0013-words.md`):
  a word a person reads is a key in `src/lib/messages/<area>.ts`, in
  English and in every other language there (a missing one fails to
  compile), read in render, never at module load. A count is
  `{n, plural, one {# project} other {# projects}}` (the forms are
  `Intl.PluralRules`'), given the number, never a formatted string. `pnpm check:words`
  refuses English written straight into a view or a component; the Kit
  page is the exception.
- **Dates, numbers and money go through `src/lib/format.ts`** (`ago`, `date`,
  `dateTime`, `day` for a day with no time such as a due day, `fileSize`, `number`, `money`): Intl, in the person's language; never a
  hand-written format. Amounts in different currencies are never added or
  compared as bare numbers: a total is one per currency (`totalsOf`), a sort
  by amount groups by currency first, unless they are converted. An amount
  shown in another currency than it is kept in is converted before
  `money()`, and says so wherever it shows (a word in the column's header, a
  `<Tip>`); the PR says where the rate comes from. A list's total or count
  over every match is the server's, in its page's `summary` (`Page`,
  lib/types.ts; Tasks' late count), never summed from the rows read so far.
- **What a host configures is `lib/config.ts`** (config.js, `docs/deploy.md`):
  a feature a deployment may turn off is a flag in `FLAGS` (`lib/flags.ts`),
  read with `flag(id)`; a usage event is a line in `EVENTS`
  (`lib/analytics.ts`) and a `track()` where it happens, with only kinds and
  states, never a name, an id or what was typed (ADR 0015).
- **Who is signed in is `lib/session.ts`**, in memory only; a 401 from any
  call asks once for a longer session, then signs out
  (`docs/decisions/0011-sessions.md`); never a token in storage. Tabs agree
  (`lib/tabs.ts`): sign-out and settings reach every tab. A test of time
  passing (a session ending) uses `page.clock`, never a wait.
- **What a person may do is `can(user, action)`** (`lib/permissions.ts`,
  `docs/decisions/0012-permissions.md`): a view asks `useCan("project.delete")`
  and leaves out what isn't theirs to do, never `user.role === …` in a
  component. The server decides; the mock refuses with a 403 under
  `?role=viewer` or `?role=member`. The contract is the table's source:
  each operation's `x-permission` (public, signed-in, or an action) and the
  top-level `x-roles` (each action's roles); `ACTIONS` is the same table,
  and `pnpm check:contract` refuses a difference, an operation without
  one, or a mock that lets a role through that `x-roles` leaves out.
- **Key hints** are written for a Mac (`⌘K`) and shown through `<Kbd>`, which
  rewrites them for other platforms.
- **Reads go through `useResource`** and are drawn by `<ResourceView>`
  (components/resource-view.tsx), which draws loading, failed and empty for
  you, and a 404 or a 403 as NotFound or Forbidden (components/not-here.tsx,
  no Try again); an address the app doesn't know is the `missing` view, not
  Home. A failed write is `toastError`. Nothing calls `fetch` outside
  `src/lib/api.ts`. A read passes on the signal it is given
  (`(signal) => client.project(id, { signal })`), so a read nobody wants
  any more stops; the client tries a dropped or turned-away read twice
  more by itself (`RETRY_DELAYS_MS`, a server's `Retry-After`), never a
  write. A list's typed search reads once the typing settles
  (`useSettled`, hooks/use-settled.ts).
- **Rows go in `<DataTable>`** (components/data-table.tsx): a sortable
  header (the sort on the `View`, as `sort=name:asc`), the arrows, PageUp/Down,
  Home and End between rows, Enter to open, and only the rows on screen in
  the DOM, so thousands stay quick (`?many=1` on the mock). Rows that can be
  acted on together take `selection` (a box per row; Space, Shift, ⌘A, Esc;
  `lib/selection.ts`), kept in the list's state and let go when its key
  changes, with a `BulkBar` (components/bulk-bar.tsx) in the toolbar's
  place: each write through `optimistic({ …, invalidate: false })` and one
  `invalidate` after, a change said with Undo, a delete asked first
  (`setStatuses`, components/bulk-status.ts, does the status for you).
- **A list that can grow is read a page at a time** with `usePages`
  (lib/resource.ts): the server filters and sorts and answers a `Page`
  (lib/pages.ts), the key names the query (`projects${listQuery(…)}`),
  and the table gets `more`, `total` and `focusRow`; its columns sort
  with `"server"`. A short, bounded list (tags, a team's roles) is read
  whole with `useResource`.
- **A list's filters are part of its `View`** (`routes.ts` writes them in
  the hash), set with `setView(…, { replace: true })`, never component
  state: reload, Back and a link keep them.
- **A form is a `FormDialog`** (components/form-dialog.tsx): it owns the
  trigger, the busy Save, the dirty check (closing with edits asks first)
  and puts a server refusal (`ApiError`, code `invalid`) on the field it
  names. A write that should show at once goes through `optimistic()`
  (lib/resource-cache.ts), which puts things back if the server refuses;
  `?hold=1` keeps every write unanswered, so a test sees what shows before
  the server confirms without racing the latency. Once a write is confirmed,
  `invalidate(listKey)` has every list of the resource on screen read again
  (`optimistic()` and `removeRecord()` call it; a form that writes on its
  own calls it after).
  Coming back to a list, the keyboard lands on the row it left through
  `returnFocusTo`/`useReturnFocus` (hooks/use-return-focus.ts).
- **Anything irreversible asks first** with `confirm()` (components/confirm.tsx).
- **The sidebar is a rail beside a sheet** (components/sidebar-rail.tsx,
  components/app-sidebar.tsx): the rail has the places pinned to it (the
  rest under its "…", `prefs.railPlaces`), the person's workspaces
  (lib/workspace.ts; every list reads the one on show, `listOf` puts it in
  the query and the key) and Settings; the sheet shows the workspace, search
  and the open place's own list (Projects' is `views/projects/projects-column.tsx`,
  lazy, following the list's read rather than making its own; elsewhere
  Recent). A record opened from another workspace brings its workspace
  with it. ⌘\ folds the sheet away and leaves the rail.
- **The frame takes what views tell it**, never a copy of the sidebar or
  the status bar: something that happened is `notify({ title, tone, action })`
  (lib/notifications.ts: a toast now, a line in the sidebar's bell); a
  place's count is `setPlaceBadge(placeId, n)` (lib/badges.ts); a fact in
  the status bar is `useStatusItem({ id, label, tip })` (hooks/); a record
  opened goes in the sidebar's Recent with `withRecent` (lib/recent.ts);
  Home's first steps are `STEPS` in lib/onboarding.ts, ticked by what the
  person does.
- **Browser tests** import `test` and `expect` from `./fixtures` (it refuses
  page errors and requests off the page), wait on what they expect
  (`toBeVisible`, `expect.poll`), never on time, and use `data-testid` or
  roles, never text that moves. A state is asserted where it lives (the
  chosen option's `aria-pressed`, a refusal as its field's
  `toHaveAccessibleDescription`), never as text found somewhere nearby,
  which a label of the same word satisfies. One behaviour per test, named
  as a sentence about what the user gets.
- **Edit `src/components/ui/` in place** (it was installed from the coss
  registry, `components.json`); re-adding a component from the registry
  overwrites local edits, so diff first.

## Node-run modules

`pnpm test` runs `src/lib/**/*.test.ts` and `scripts/*.test.mjs` with
`node --test --experimental-strip-types`, no bundler (the themes' test,
`src/themes/contrast.test.ts`, runs under `pnpm check:themes`). A module those tests load (and the test itself):
- imports at runtime by relative path with the extension (`./x.ts`,
  `./x.json` with `with { type: "json" }`); `@/` works only in `import type`;
- has no `enum`, `namespace` or constructor parameter properties;
- doesn't touch the DOM or `import.meta.env` at load time (see the guard in
  `src/lib/api.ts`).
A test that loads a module afresh (`import("./prefs.ts?case")`, to read
another saved state) makes coverage count it as a module of its own, with
its own uncovered functions: keep those to the one or two a case needs.
The thresholds are for all the node-run modules together, so a new module
can pass with little of it run: give it its own `*.test.ts`, as the
recipes say, rather than leaning on the total.
`src/components` and `src/views` are `.tsx` and never run in node: their
behaviour is proven in `e2e/`.

## Adding things

Each of these has a skill that is its checklist: load it before you start,
and follow it step by step (the compiler and `pnpm check:views` refuse a
half-wired view, but nothing refuses a missing test or word).

- **A view** (`add-view`): a `kind` in `View`, its address and round trip,
  a lazy view in `App.tsx`, a place in `nav.tsx` before Kit, a
  `data-testid` on its root, an axe scene, a scene in `e2e/scenes.json`
  (required) and a behaviour test.
- **A resource** (`add-resource`): a type, `Client` methods, the contract
  in `api/openapi.json`, the mock through `guard()`, its actions in
  `ACTIONS`, and a view after `views/projects/` (`views/tasks/` for a
  picker, a filter on another record, a file and a default filter) built
  from the shared pieces: you write the columns, the fields and the words.
- **A form** (`add-form`): a `FormDialog`, a refusal on the field it names.
- **A setting** (`add-setting`): first, whose it is. A person's own choice
  is a pref (`Prefs`, held to its shape in `fromSaved`, a `SettingsRow`,
  its words in `settings.findWords`); a workspace's or a team's is the
  server's (a field on `Workspace`), with a per-workspace pref only as a
  fallback said under Assumptions. A list's default filter is written
  into the address (`withDefault`).
- **A shortcut** (`add-shortcut`): `shortcuts.json`, `keys.ts` and its
  reachability test, `run` in `use-shortcuts.ts`, its name in both
  languages, a press in `e2e/shell.spec.ts`.
- **A theme** (`add-theme`): `pnpm check:themes` must pass; nudge lightness
  only, and note it.
- **A component in the kit:** show it on the Kit page (`src/views/kit/`); a
  new section goes in `KIT_SECTIONS` (`src/views/kit/sections.ts`), and the
  axe scenes in `e2e/a11y.spec.ts` follow that list on their own.

## House style

- A file opens with a prose comment that says what the module is for and
  which modules it touches; functions are introduced as `// name does X`,
  not JSDoc. Comments say why, not what.
- UI copy is plain words ("Nothing yet", "Couldn't save the project"); the
  raw error goes behind Details, never on screen as the message.
- British spelling in comments and copy ("colour", "behaviour").
- Tests are named as sentences about what the user gets.
- Biome formats at a line width of 200: don't hand-wrap.
