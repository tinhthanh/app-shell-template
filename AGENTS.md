# Working on this app

A frontend-only React app: Vite 8, React 19, Tailwind 4, coss ui on Base
UI, zustand, Playwright. There is no backend here; the views read through
`src/lib/api.ts`, which runs on the fixtures in `src/lib/mock.ts` unless
`VITE_API_URL` is set. `docs/architecture.md` has the map and the
vocabulary; `docs/decisions/` has why things are the way they are; the
skills in `.claude/skills/` (`e2e-tests`, `add-view`, `add-resource`,
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
```

`pnpm exec playwright test` alone serves whatever is in `dist/`, which is
the build from before your change: always go through `test:e2e`, which
builds. CI (`.github/workflows/ci.yml`) runs all of it, the whole browser
suite included, in both appearances.

## Done means

1. `pnpm check` is green, and the specs for what you touched pass.
2. Every behaviour you changed has a test that proves it (the table below),
   named in the PR. A bug fix has a test that failed before the fix.
3. A UI change has a screenshot in Default Dark and Default Light
   (`pnpm shots` writes them to `shots/`), and its axe scene is updated; a
   new kit component gets a Kit section, a new view or settings section an
   axe scene.
4. A user-visible change has a bullet under `## Unreleased` in `CHANGELOG.md`.
5. No new `biome-ignore`, `test.skip`, `test.fixme` or `ALLOW` entry without
   a reason beside it.
6. The work is on a branch, as a PR against `main`, with a lowercase
   conventional subject (`feat: …`, `fix: …`, `test: …`, `docs: …`,
   `ci: …`, `chore: …`) that says what the user gets. The PR template's
   Proof section is filled in.

CI holds you to this: the `evidence` job refuses a change under `src/`
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
- **Density and tokens:** rows use `h-row`/`py-row-pad`/`h-side-row`;
  colours use the theme's tokens or a tone, never a hard-coded hex or a
  Tailwind palette class.
- **Dates and numbers go through `src/lib/format.ts`** (`ago`, `date`,
  `dateTime`, `number`): Intl, in the person's language; never a
  hand-written format.
- **Who is signed in is `lib/session.ts`**, in memory only; a 401 from any
  call signs out (`docs/decisions/0011-sessions.md`); never a token in
  storage.
- **Key hints** are written for a Mac (`⌘K`) and shown through `<Kbd>`, which
  rewrites them for other platforms.
- **Reads go through `useResource`** and are drawn by `<ResourceView>`
  (components/resource-view.tsx), which draws loading, failed and empty for
  you; a failed write is `toastError`. Nothing calls `fetch` outside
  `src/lib/api.ts`.
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
  `App.tsx`; a place in `src/lib/nav.tsx` (append before the footer place:
  ⌘1–9 follow the order); a `data-testid` on the view's root; a scene in
  `e2e/a11y.spec.ts`; a behaviour test.
- **A setting:** a field and its default in `Prefs` (`src/lib/prefs.ts`; a
  nested object is merged in the initialiser, as `systemThemes` is); a
  `SettingsRow` in a section; `applyUiPrefs` if it changes layout. A new
  field needs no version bump: the initialiser's spread fills in its
  default (test that an old save gets it); bump `PREFS_VERSION` and add a
  `migratePrefs` step only when an existing default changes in a way an old
  saved value shouldn't override. A pick-one value that isn't one of the
  options falls back to the default in the initialiser, as `sidebarWidth`
  is clamped. A new section also needs
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
  `mock.test.ts` and `api.test.ts`; a view copied from `views/projects/`:
  keyed reads, filters on the `View`, optimistic writes through `mutate`,
  create and delete, the dirty-check on its dialog.
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
