# App Shell template

A frontend-only starting point for a desktop-style web app: React 19, Vite 8,
Tailwind 4 and the [coss ui](https://coss.com/ui) kit on
[Base UI](https://base-ui.com), with the shell already built and tested.
There is no backend: the views read through one API client that runs on
fixtures until you point it at a server.

What you get, wired and working:

- **Shell**: a resizable sidebar that folds to a rail, a command palette
  (⌘K), a status bar, a settings view with four sections, keyboard
  shortcuts from one table, error boundaries per view, lazy-loaded views
  that preload when idle.
- **23 themes**: four of the app's own and ports of popular editor themes,
  applied as CSS variables, each checked for WCAG contrast by a test. Match
  system picks a light and a dark one.
- **Preferences** in localStorage with a versioned migration, density and
  text size as root variables, zoom with a HUD.
- **An API layer** (`src/lib/api.ts`) with an HTTP client and a mock client
  over fixtures, selected by `?mock=1` or the absence of `VITE_API_URL`;
  `useResource` draws any read in its loading, failed and loaded states.
- **Accessibility by design**: focus never falls to `<body>` when what had
  it goes away, tooltips show on keyboard focus, a live region announces
  changes, and axe runs over every screen in CI.
- **Checks**: TypeScript, a `title=` lint, the theme contrast test, node
  unit tests, a Playwright suite on the production build, all in one
  GitHub Actions workflow.

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:1420 on the mock fixtures
pnpm check          # typecheck, lints, unit tests, build
pnpm test:e2e       # the browser suite (installs Chromium the first time with
                    #   pnpm exec playwright install --with-deps chromium)
```

Point it at a server with `VITE_API_URL=http://localhost:8080 pnpm dev`
(see `.env.example`). The mock takes knobs in the URL: `?mock=1&slow=1`,
`&fail=1`, `&empty=1`, `&platform=linux`.

## Layout

```
src/
  main.tsx, App.tsx     the entry and the shell: sidebar, main area, status bar, dialogs
  index.css             Tailwind, the coss tokens, density and tone variables, motion rules
  components/ui/        the coss ui kit (54 components), edited in place
  components/           the app's own: tip, error-boundary, pixel-loader, pick-one, filter-chip,
                        app-sidebar, command-palette, shortcuts-sheet, status-bar, sidebar-resize-handle
  hooks/                use-theme, use-shortcuts, use-window-title, use-media-query, use-modal-open
  lib/                  api (the client), mock (fixtures), resource (reads in three states),
                        store (view, theme, palette), prefs (saved settings), nav (the places),
                        shortcuts (the one table), platform (⌘ vs Ctrl), focus-home, storage, …
  themes/               builtin.ts and vscode.ts (the themes), apply.ts, tones.ts, contrast.ts + test
  views/                home/, projects/ (the example resource), settings/, view-header.tsx
e2e/                    Playwright: fixtures.ts, shell, projects, settings and a11y specs
scripts/check-titles.mjs
```

## Make it yours

1. **Name it**: `APP_NAME` in `src/lib/app.ts`, `<title>` in `index.html`,
   `public/favicon.svg`, `name` in `package.json`.
2. **Your resource**: replace `Project` in `src/lib/types.ts`, the paths in
   `httpClient` (`src/lib/api.ts`) and the fixtures in `src/lib/mock.ts`;
   copy `views/projects/` for each list-and-detail view.
3. **A view**: a `kind` in `View` (`src/lib/store.ts`), a `lazyView` in
   `App.tsx`, a place in `src/lib/nav.tsx`. The sidebar, ⌘1–9 and the
   palette follow.
4. **A setting**: a field in `Prefs` with a default (`src/lib/prefs.ts`),
   a `SettingsRow` in a section. Bump `PREFS_VERSION` and add a step to
   `migratePrefs` when a default changes in a way an old value shouldn't
   override.
5. **A shortcut**: a line in `src/lib/shortcuts.json`, a key in `idOf` and a
   case in `run` (`src/hooks/use-shortcuts.ts`). The sheet and Settings
   list it on their own.
6. **A theme**: a `Theme` in `src/themes/builtin.ts`; `pnpm check:themes`
   tells you what to fix.
7. **A browser test**: a spec in `e2e/` on the `app` fixture, on stable
   hooks (`data-testid`, roles), waiting on what it expects, never on time.

## Conventions

- Tooltips are `<Tip>`, never the HTML `title` attribute (`check:titles`).
- Rows take their height from density (`h-row`, `py-row-pad`,
  `h-side-row`), not their own numbers.
- Colours come from the theme's tokens; a tag or group wears a tone
  (`themes/tones.ts`), kept clear of the state colours.
- Key hints are written for a Mac (`⌘K`) and shown as `Ctrl+K` elsewhere
  (`<Kbd>`, `platformKeys`).
- Every view that reads data uses `useResource` and draws all three states.
- A test never reaches off the page: the fixture refuses it.

## Where it comes from

The code is extracted from the desktop app of
[Shipyard](https://github.com/cosscom/shipyard), with its product removed.
MIT; see `LICENSE` and `THIRD_PARTY_NOTICES.md`.
