# App Shell template

A frontend-only starting point for a desktop-style web app: React 19, Vite 8,
Tailwind 4 and the [coss ui](https://coss.com/ui) kit on
[Base UI](https://base-ui.com), with the shell already built and tested.
There is no backend: the views read through one API client that runs on
fixtures until you point it at a server.

What you get, wired and working:

- **Shell**: a sidebar after Shipyard's, a rail of places and workspaces
  beside a resizable sheet with the workspace, search and the open place's
  own list (⌘\ folds the sheet away; a phone gets a top bar with a menu
  sheet), a notification bell, counts on places, Recent, a status bar
  views can add to, a getting-started list on Home, a command palette
  (⌘K), a settings page with four sections and a search, keyboard shortcuts from one table, error boundaries per view,
  lazy-loaded views that preload when idle, and every view at a hash
  address (`#/projects/p-shop`), so reload, the back button and links work.
- **23 themes**: four of the app's own and ports of popular editor themes,
  applied as CSS variables, each checked for WCAG contrast by a test. The
  first launch follows the system; the next starts in the right appearance
  before the first paint.
- **Preferences** in localStorage with a versioned migration, density and
  text size as root variables, zoom with a HUD.
- **An API layer** (`src/lib/api.ts`) with an HTTP client and a mock client
  over fixtures, used when no API is configured (`VITE_API_URL`, or
  `apiUrl` in `config.js`); `useResource` draws any read in its loading,
  failed and loaded states, and a list that can grow is read a page at a
  time (`usePages`), filtered and sorted by the server.
- **Sign-in, roles and permissions**: a sign-in page when nobody is signed
  in (a 401 from any call signs out), and one table of what each role may
  do (`src/lib/permissions.ts`), so a view leaves out what isn't the
  person's to do.
- **English and Vietnamese**: every word goes through `t()`
  (`src/lib/i18n.ts`, `src/lib/messages/`), with dates and numbers in the
  person's language; a Language setting, or the system's.
- **Patterns you'd otherwise write again**: errors in plain words with the
  raw text behind Details (`explain`, `ErrorNote`, `toastError`), a
  `confirm()` you can call from anywhere, a validated form that shows the
  server's refusal on the field, and a Kit page that shows every component
  in the theme in use.
- **Right-to-left and print**: every width-wise style is logical, so
  `?dir=rtl` mirrors the app; printing a view leaves out the chrome.
- **Accessibility by design**: focus never falls to `<body>` when what had
  it goes away, tooltips show on keyboard focus, a live region announces
  changes, and axe runs over every screen in CI.
- **Checks**: TypeScript, Biome (lint and format), scripts that hold the
  rules (no `title=`, no English outside `t()`, the type scale, the layout
  grid, the CSP hash, the bundle's size), the theme contrast test, node
  unit tests, a Playwright suite on the
  production build with axe in both appearances, all in one GitHub Actions
  workflow.

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:1420 on the mock fixtures
pnpm stub           # the API contract (api/openapi.json) served from the fixtures, on :8787;
                    #   VITE_API_URL=http://localhost:8787 pnpm dev runs the real HTTP client
pnpm check          # typecheck, lint, the rule checks, themes, unit tests, build, size
pnpm format         # Biome, in place
pnpm test:e2e       # the browser suite (installs Chromium the first time with
                    #   pnpm exec playwright install --with-deps chromium)
```

Point it at a server with `VITE_API_URL=http://localhost:8080 pnpm dev`
(see `.env.example`). The mock takes knobs in the URL: `?mock=1&slow=1`,
`&fail=1`, `&empty=1`, `&platform=linux`.

## Reading on

- `AGENTS.md`: the rules, what "done" means, which test proves which
  change, the recipes.
- `docs/architecture.md`: how a read flows, where state lives, themes,
  routing, what the browser suite guarantees, the knobs, the vocabulary.
- `docs/decisions/`: why things are the way they are (hash routing, mock
  by default, node tests, the system theme, the kit, the e2e contract…).
- `.claude/skills/`: step-by-step for an agent: `e2e-tests`, `add-view`,
  `add-resource`, `add-form`, `add-theme`, `release`, `trial` (how the template is
  measured; the scores are in `docs/trials.md`). `CONTRIBUTING.md` is the
  page for people.

## Layout

Each file opens with a comment that says what it is for; this is only
where to look.

```
src/              the app: App.tsx (the shell), index.css (tokens, type scale, grid)
  components/     the app's own components; ui/ is the coss ui kit, edited in place
  hooks/          React hooks the shell and views share
  lib/            logic, most of it run by the node tests: the API client, the mock, the store, routes, words
  themes/         the themes, how they are applied, and their contrast check
  views/          one folder per view: home, projects (the example resource), tasks (a second, with a day, a record picked and a file), kit, settings, signin
e2e/              the Playwright suite, its fixture and its screenshot baselines
scripts/          the checks pnpm check runs, the contract's check and stub, and the release, shots and CI helpers
api/              openapi.json: the API the client asks of a server, which the mock and the stub keep
biome-plugins/    the lint rules Biome can't state on its own
docs/             the map (architecture.md), the decisions, deploying, the trials
deploy/           the Docker image, nginx and the CSP
public/           config.js (set by the host after the build) and the favicon
```

## Make it yours

The complete recipes, with every file each one touches, are in
`AGENTS.md` ("Adding things"); this is the short version.

0. **Set up the repository** once, from your copy with `gh` signed in:
   `node scripts/setup-repo.mjs`. It creates the `guardrail-change` label,
   applies the ruleset on `main` and puts you in `.github/CODEOWNERS`, then
   says what is left for Pages (a variable, `API_URL` or `MOCK=1`, and the
   Pages source). Until then the Pages run is skipped, not failed.
1. **Name it**: the name people read comes from `APP_NAME` in
   `src/lib/app.ts` (the sidebar, the window's title, Home's welcome,
   Settings › About); then `<title>` in `index.html`, `public/favicon.svg`,
   `name` and `version` in `package.json`, this README's title, the
   contributor line in `LICENSE`, and start `CHANGELOG.md` afresh. The
   name shows in every screenshot baseline: take them again with
   `pnpm test:visual --update` (Docker on a Mac) and commit `e2e/snapshots/`. The storage keys (`app.*`) are identifiers:
   two apps from this template on the same origin share them unless you
   rename them in `src/lib/store.ts`, `prefs.ts`, `themes/apply.ts`, the
   inline appearance script in `index.html` (its hash in `deploy/csp.txt`
   must be redone: `pnpm check:csp` prints the new one) and
   `e2e/fixtures.ts`.
2. **Your resource**: describe it in `api/openapi.json` first (hand it to
   whoever builds the server), then replace `Project` in `src/lib/types.ts`, the paths in
   `httpClient` (`src/lib/api.ts`) and the fixtures in `src/lib/mock.ts`;
   a list-and-detail view after `views/projects/`, on the shared pieces
   (`ListToolbar`, `DataTable`, `DetailPage`, `FormDialog`, `optimistic()`,
   `removeRecord()`): you write the columns, the fields and the words.
   Projects also reach into the frame: the sheet's column
   (`views/projects/projects-column.tsx`, its case in `SidebarSheet` in
   `components/app-sidebar.tsx`), the palette's `RECORD_KINDS` (`src/lib/nav.tsx`),
   Recent's kind, the "Open a project" step (`src/lib/onboarding.ts`) and
   their words (`src/lib/messages/projects.ts`). Keep `Workspace` if your
   records belong to one (the `add-resource` skill has the step); without
   it, drop the rail's tiles and `workspace` from the query.
3. **A view**: a `kind` in `View` (`src/lib/store.ts`), its address in
   `src/lib/routes.ts`, a `lazyView` in `App.tsx`, a place in
   `src/lib/nav.tsx`. The rail, ⌘1–9 and the palette follow; the sheet
   shows Recent for it until you give it a list of its own.
4. **A setting**: a field in `Prefs` with a default (`src/lib/prefs.ts`),
   a `SettingsRow` in a section. Bump `PREFS_VERSION` and add a step to
   `migratePrefs` when a default changes in a way an old value shouldn't
   override.
5. **A shortcut**: a line in `src/lib/shortcuts.json`, an id in
   `SHORTCUT_IDS`, a key in `shortcutFor` and a press in `keys.test.ts`
   (`src/lib/`), a case in `run` (`src/hooks/use-shortcuts.ts`). The sheet
   and Settings list it on their own; AGENTS.md has the full recipe.
6. **A theme**: a `Theme` in `src/themes/builtin.ts`; `pnpm check:themes`
   tells you what to fix.
7. **A browser test**: a spec in `e2e/` on the `app` fixture, on stable
   hooks (`data-testid`, roles), waiting on what it expects, never on time.

## Conventions

The rules an agent or a person follows here are in `AGENTS.md`. The short
version:

- Tooltips are `<Tip>`, never the HTML `title` attribute (`check:titles`).
- Rows take their height from density (`h-row`, `py-row-pad`,
  `h-side-row`), not their own numbers.
- Colours come from the theme's tokens; a tag or group wears a tone
  (`themes/tones.ts`), kept clear of the state colours.
- Key hints are written for a Mac (`⌘K`) and shown as `Ctrl+K` elsewhere
  (`<Kbd>`, `platformKeys`).
- Every view that reads data uses `useResource` and draws all three states;
  a failure is an `ErrorNote`, never raw text.
- Anything that can't be undone goes through `confirm()`.
- A test never reaches off the page: the fixture refuses it.

## Where it comes from

The code is extracted from the desktop app of
[Shipyard](https://github.com/cosscom/shipyard), with its product removed.
MIT; see `LICENSE` and `THIRD_PARTY_NOTICES.md`.
