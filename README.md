# App Shell template

A frontend-only starting point for a desktop-style web app: React 19, Vite 8,
Tailwind 4 and the [coss ui](https://coss.com/ui) kit on
[Base UI](https://base-ui.com), with the shell already built and tested.
There is no backend: the views read through one API client that runs on
fixtures until you point it at a server.

What you get, wired and working:

- **Shell**: a resizable sidebar that folds to a rail on a narrow window
  and becomes a top bar with a menu sheet on a phone, a command palette (⌘K), a status bar, a settings view with four
  sections, keyboard shortcuts from one table, error boundaries per view,
  lazy-loaded views that preload when idle, and every view at a hash
  address (`#/projects/p-shop`), so reload, the back button and links work.
- **23 themes**: four of the app's own and ports of popular editor themes,
  applied as CSS variables, each checked for WCAG contrast by a test. The
  first launch follows the system; the next starts in the right appearance
  before the first paint.
- **Preferences** in localStorage with a versioned migration, density and
  text size as root variables, zoom with a HUD.
- **An API layer** (`src/lib/api.ts`) with an HTTP client and a mock client
  over fixtures, selected by `?mock=1` or the absence of `VITE_API_URL`;
  `useResource` draws any read in its loading, failed and loaded states.
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
- **Checks**: TypeScript, Biome (lint and format), a `title=` lint, the
  theme contrast test, node unit tests, a Playwright suite on the
  production build with axe in both appearances, all in one GitHub Actions
  workflow.

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:1420 on the mock fixtures
pnpm check          # typecheck, lint, titles, themes, unit tests, build
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
  `add-resource`, `add-form`, `add-theme`. `CONTRIBUTING.md` is the page for people.

## Layout

```
src/
  main.tsx, App.tsx     the entry and the shell: sidebar, main area, status bar, dialogs
  index.css             Tailwind, the coss tokens, density and tone variables, motion rules
  components/ui/        the coss ui kit (53 components), edited in place
  components/           the app's own: tip, error-boundary, error-note, confirm, pixel-loader, pick-one,
                        filter-chip, app-sidebar, command-palette, shortcuts-sheet, status-bar, sidebar-resize-handle
  hooks/                use-theme, use-shortcuts, use-window-title, use-media-query, use-modal-open
  lib/                  api (the client), mock (fixtures), resource (reads in three states),
                        explain (errors in words), store (view, theme, palette), routes (the hash),
                        prefs (saved settings), nav (the places), shortcuts (the one table),
                        platform (⌘ vs Ctrl), focus-home, announce, poll, storage, …
  themes/               builtin.ts and vscode.ts (the themes), apply.ts, tones.ts, contrast.ts + test
  views/                home/, projects/ (the example resource), kit/ (the components), settings/
e2e/                    Playwright: fixtures.ts, shell, projects, settings, motion and a11y specs
scripts/                check-titles, check-node-imports, check-views, check-evidence, check-guardrails
biome-plugins/          no hex colours, no palette classes, no waitForTimeout
docs/                   architecture.md, decisions/
```

## Make it yours

The complete recipes, with every file each one touches, are in
`AGENTS.md` ("Adding things"); this is the short version.

1. **Name it**: `APP_NAME` in `src/lib/app.ts`, `<title>` in `index.html`,
   `public/favicon.svg`, `name` and `version` in `package.json`, this
   README's title, the Home page's heading (`src/views/home/home-view.tsx`),
   the contributor line in `LICENSE`, the owner in `.github/CODEOWNERS`, and
   start `CHANGELOG.md` afresh. The storage keys (`app.*`) are identifiers:
   two apps from this template on the same origin share them unless you
   rename them in `src/lib/store.ts`, `prefs.ts` and `themes/apply.ts`.
2. **Your resource**: replace `Project` in `src/lib/types.ts`, the paths in
   `httpClient` (`src/lib/api.ts`) and the fixtures in `src/lib/mock.ts`;
   copy `views/projects/` for each list-and-detail view.
3. **A view**: a `kind` in `View` (`src/lib/store.ts`), its address in
   `src/lib/routes.ts`, a `lazyView` in `App.tsx`, a place in
   `src/lib/nav.tsx`. The sidebar, ⌘1–9 and the palette follow.
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
