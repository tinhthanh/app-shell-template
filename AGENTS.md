# Working on this app

A frontend-only React app: Vite 8, React 19, Tailwind 4, coss ui on Base
UI, zustand, Playwright. There is no backend here; the views read through
`src/lib/api.ts`, which runs on the fixtures in `src/lib/mock.ts` unless
`VITE_API_URL` is set. `docs/architecture.md` has the map and the
vocabulary; `docs/decisions/` has why things are the way they are; the
skills in `.claude/skills/` (`e2e-tests`, `add-view`, `add-resource`, `add-form`, `trial`,
`add-theme`) walk through the recipes below step by step.

## Tooling

- `pnpm install` points git at `.githooks/`: pre-commit formats what's
  staged in place and re-stages it, lints, and checks titles; commit-msg
  checks the subject; pre-push runs `pnpm check`. Never `--no-verify`: CI
  runs the same and more. Edits made from a shell aren't formatted by the
  editor hook, so run `pnpm format` before you look at a diff.
- Claude Code reads `.claude/settings.json`: a Stop hook runs `pnpm check`
  when the tree has changes and blocks stopping while it is red; an
  Edit/Write hook formats the file; force pushes, pushes to `main`,
  `pkill` and killing port 1420 are refused.

- Node 22 (`.nvmrc`) and pnpm 11 (`packageManager`). If `pnpm` is not on
  your PATH, run it as `npx pnpm@11` (or `corepack enable` on Node 22–24).
- Chromium for the browser tests, once: `pnpm exec playwright install --with-deps chromium`.

## Checks

Run these before you call something done, and paste their last lines in
the PR:

```sh
pnpm check                                   # typecheck, lint, titles, themes, unit tests, build
pnpm test:coverage                           # the node-run modules: lines 90%, branches and functions 80% (CI runs it)
E2E_PORT=1427 pnpm test:e2e e2e/x.spec.ts    # the specs you touched: builds first, then Playwright
E2E_PORT=1427 pnpm test:e2e e2e/x.spec.ts --repeat-each=5   # before calling a flake fixed
pnpm test:visual                             # when the look changed: the screenshots against e2e/snapshots/ (Docker on a Mac)
pnpm test:visual --update                    # …and the new baselines, committed with the change
```

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
suite included, in both appearances.

## Done means

1. `pnpm check` is green, and the specs for what you touched pass.
2. Every behaviour you changed has a test that proves it (the table below),
   named in the PR. A bug fix has a test that failed before the fix. A
   failure you say isn't yours ("it fails on main too") comes with its
   proof: the run on `main` (a CI link, or the command and its last lines).
3. A UI change that alters a view in `e2e/visual.spec.ts` updates its
   baselines (`pnpm test:visual --update`), and the PR shows them.
4. A UI change has a screenshot in Default Dark and Default Light
   (`pnpm shots` writes them to `shots/`), and its axe scene is updated; a
   new kit component gets a Kit section, a new view or settings section an
   axe scene.
5. A user-visible change has a bullet under `## Unreleased` in `CHANGELOG.md`.
6. No new `biome-ignore`, `test.skip`, `test.fixme` or `ALLOW` entry without
   a reason beside it.
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
possible) and a user-visible change with no changelog bullet; the
`guardrails` job refuses `test.skip`, `test.fixme`, `test.only`,
`@ts-ignore`, a `biome-ignore` without a reason, and any edit to the checks,
configs or these rules without the `guardrail-change` label.

## Which test proves it

| You changed | The proof |
|---|---|
| Pure logic in `src/lib/*.ts` or `src/themes/*.ts` | A `*.test.ts` beside it, run by node (see "Node-run modules") |
| A view | Its round trip in `src/lib/routes.test.ts`, a scene in `e2e/a11y.spec.ts`, a behaviour test in an e2e spec |
| A setting | A `prefs.test.ts` case (default, and the migration when `PREFS_VERSION` moves), and `e2e/settings.spec.ts` showing it persists (`app.stored("app.prefs")`) |
| A shortcut | `src/lib/keys.test.ts` (the press reaches it), and `e2e/shell.spec.ts` pressing it with the `mod` helper |
| A resource, or a view that reads | `src/lib/mock.test.ts`, and an e2e spec for loading, failed and empty through `?slow=1`, `?fail=1`, `?empty=1` (`<ResourceView testid="x">` names them `x-loading`, `x-failed`, `x-empty`) |
| A UI-kit component | A section on the Kit page (axe checks it in both appearances) |
| A theme | `pnpm check:themes` |
| Component behaviour (focus, dialogs, layout) | An e2e spec. There is no DOM test runner here, and we don't add one: Playwright on the real build is the proof |

## Rules

- **Ports:** 1420 is the dev server. Playwright uses `E2E_PORT` in
  1421–1439; check the port is free first (`lsof -nP -iTCP:1427 -sTCP:LISTEN`).
- **Kill only PIDs you started.** No `pkill node`, `pkill vite` or the like.
- **No `title=`** on anything interactive or that carries meaning (an icon,
  a badge); use `<Tip>`. Plain truncated text may keep one (`check:titles`).
- **Fixtures are synthetic** ("acme"). Nothing real goes in `src/lib/mock.ts`.
- **No secrets** in code, URLs or logs. Configuration goes through `VITE_*`
  env vars (`.env.example`).
- **Sides are logical:** `start`/`end`, `ps`/`pe`, `ms`/`me`, `border-s`/`border-e`,
  `text-start`/`text-end`, never `left`/`right` (a Biome plugin refuses them
  outside the kit), so `?dir=rtl` mirrors the whole app.
- **Density and tokens:** rows use `h-row`/`py-row-pad`/`h-side-row`;
  colours use the theme's tokens or a tone, never a hard-coded hex or a
  Tailwind palette class.
- **Words go through `t()`** (`src/lib/i18n.ts`, `docs/decisions/0013-words.md`):
  a word a person reads is a key in `src/lib/messages/<area>.ts`, in
  English and in every other language there (a missing one fails to
  compile), read in render, never at module load. `pnpm check:words`
  refuses English written straight into a view or a component; the Kit
  page is the exception.
- **Dates and numbers go through `src/lib/format.ts`** (`ago`, `date`,
  `dateTime`, `number`): Intl, in the person's language; never a
  hand-written format.
- **Who is signed in is `lib/session.ts`**, in memory only; a 401 from any
  call signs out (`docs/decisions/0011-sessions.md`); never a token in
  storage.
- **What a person may do is `can(user, action)`** (`lib/permissions.ts`,
  `docs/decisions/0012-permissions.md`): a view asks `useCan("project.delete")`
  and leaves out what isn't theirs to do, never `user.role === …` in a
  component. The server decides; the mock refuses with a 403 under
  `?role=viewer` or `?role=member`.
- **Key hints** are written for a Mac (`⌘K`) and shown through `<Kbd>`, which
  rewrites them for other platforms.
- **Reads go through `useResource`** and are drawn by `<ResourceView>`
  (components/resource-view.tsx), which draws loading, failed and empty for
  you; a failed write is `toastError`. Nothing calls `fetch` outside
  `src/lib/api.ts`.
- **Rows go in `<DataTable>`** (components/data-table.tsx): a sortable
  header (the sort on the `View`, as `sort=name:asc`), the arrows, PageUp/Down,
  Home and End between rows, Enter to open, and only the rows on screen in
  the DOM, so thousands stay quick (`?many=1` on the mock).
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
  (lib/resource-cache.ts), which puts things back if the server refuses.
  Coming back to a list, the keyboard lands on the row it left through
  `returnFocusTo`/`useReturnFocus` (hooks/use-return-focus.ts).
- **Anything irreversible asks first** with `confirm()` (components/confirm.tsx).
- **Browser tests** import `test` and `expect` from `./fixtures` (it refuses
  page errors and requests off the page), wait on what they expect
  (`toBeVisible`, `expect.poll`), never on time, and use `data-testid` or
  roles, never text that moves. One behaviour per test, named as a sentence
  about what the user gets.
- **Edit `src/components/ui/` in place** (it was installed from the coss
  registry, `components.json`); re-adding a component from the registry
  overwrites local edits, so diff first.

## Node-run modules

`pnpm test` runs `src/**/*.test.ts` with `node --test --experimental-strip-types`,
no bundler. A module those tests load (and the test itself):
- imports at runtime by relative path with the extension (`./x.ts`,
  `./x.json` with `with { type: "json" }`); `@/` works only in `import type`;
- has no `enum`, `namespace` or constructor parameter properties;
- doesn't touch the DOM or `import.meta.env` at load time (see the guard in
  `src/lib/api.ts`).
`src/components` and `src/views` are `.tsx` and never run in node: their
behaviour is proven in `e2e/`.

## Adding things

- **A view:** a `kind` in `View` (`src/lib/store.ts`); its address in
  `viewToHash` and `hashToView` (`src/lib/routes.ts`) and the round trip in
  `routes.test.ts`; a `lazyView`, a render line and a `viewTitles` entry in
  `App.tsx`; a place in `src/lib/nav.tsx` (a product place goes before
  Kit, which stays last of the top group; ⌘1–9 follow the order); a
  `data-testid` on the view's root; a scene in
  `e2e/a11y.spec.ts`; a behaviour test.
- **A setting:** a field and its default in `Prefs` (`src/lib/prefs.ts`; a
  nested object is merged in the initialiser, as `systemThemes` is); a
  `SettingsRow` in a section; `applyUiPrefs` if it changes layout. A new
  field needs no version bump: the initialiser's spread fills in its
  default (test that an old save gets it); bump `PREFS_VERSION` and add a
  `migratePrefs` step only when an existing default changes in a way an old
  saved value shouldn't override. A pick-one value that isn't one of the
  options falls back to the default in the initialiser, as `sidebarWidth`
  is clamped (test that a malformed save falls back). A setting that is a
  list's default filter fills in only when the address doesn't name that
  filter: the address wins, so a link means the same to everyone it is
  sent to (say in the PR how a link shows it). A new section also needs
  `SettingsSectionId` in `store.ts`, `SECTIONS` in `routes.ts` and in
  `settings-view.tsx`, and an a11y scene.
- **A shortcut:** a line in `src/lib/shortcuts.json` (a new group also goes
  in `ShortcutGroup`/`SHORTCUT_GROUPS` in `shortcuts.ts`), its id in
  `SHORTCUT_IDS` and a line in `shortcutFor` (`src/lib/keys.ts`; a Shift
  shortcut goes above the Shift guard, compared as `k.toLowerCase()`; stay
  clear of the browser's own keys such as ⌘⇧T, ⌘W, ⌘N, ⌘T), a press in
  `keys.test.ts`'s reachability list, and a case in `run`
  (`src/hooks/use-shortcuts.ts`); an item in the palette if it should be
  searchable; `announce()` what it did when nothing shows on screen.
- **A theme:** a `Theme` in `src/themes/builtin.ts` (colours and the full
  terminal palette; a unique id); `pnpm check:themes` must pass
  (`THEME_REPORT=1` prints the margins; nudge lightness only, and note it);
  a ported theme gets a row in `THIRD_PARTY_NOTICES.md`.
- **A resource:** a type in `src/lib/types.ts` (import-free), methods on
  `Client` with their paths in `httpClient` (`src/lib/api.ts`), fixtures and
  the mock methods (through `guard()`, cloning what they return) in
  `src/lib/mock.ts` (read, read one, create, update, delete), cases in
  `mock.test.ts` and `api.test.ts`; a view after `views/projects/`: keyed
  reads (a page at a time when the list can grow), filters on the `View` in a `ListToolbar` (`NothingMatches` when
  they leave none), rows in a `DataTable`, one record in a `DetailPage`,
  writes through `optimistic()`, create and edit in a `FormDialog`, delete
  through `removeRecord()`: what you write is the columns, the fields and
  the words. A refusal names its
  field: `new ApiError(message, 422, "invalid", "name")`. Say in the PR's
  Assumptions what the task left open and you decided (fields, statuses,
  defaults, where the place goes), and under Not done what you left out.
- **A component in the kit:** show it on the Kit page (`src/views/kit/`); a
  new section goes in its `SECTIONS` and in the list in `e2e/a11y.spec.ts`.

## House style

- A file opens with a prose comment that says what the module is for and
  which modules it touches; functions are introduced as `// name does X`,
  not JSDoc. Comments say why, not what.
- UI copy is plain words ("Nothing yet", "Couldn't save the project"); the
  raw error goes behind Details, never on screen as the message.
- British spelling in comments and copy ("colour", "behaviour").
- Tests are named as sentences about what the user gets.
- Biome formats at a line width of 200: don't hand-wrap.
