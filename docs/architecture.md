# How the app is put together

A map for someone, or some agent, dropped in with one task. The code's
file headers say what each module is for; this says how they connect.
`AGENTS.md` has the rules; `docs/decisions/` has the reasons.

## A read, end to end

```
view            useResource(() => client.projects(), [])      src/lib/resource.ts
  └─ client     mockClient() | httpClient(VITE_API_URL)       src/lib/api.ts, src/lib/mock.ts
       └─ answers with data, or throws ApiError(message, status, code)   src/lib/errors.ts
<ResourceView>  loading   → <PixelLoader>                      src/components/resource-view.tsx
                failed    → <ErrorNote error onRetry>          src/components/error-note.tsx (lib/explain.ts)
                ready     → empty, or the data through children
                (the status is a union: lib/resource-state.ts has the transitions)
a write         await client.updateProject(...); reload()     toastError on failure
                a 422 with code "invalid" lands on the field   views/projects (the edit form)
```

`client` is chosen once, at load: the fixtures when `?mock=1` is in the
URL or no API is configured (`isMock()`), else HTTP. Views never call
`fetch` (Biome refuses it outside `api.ts`). `useResource` keeps the old
data while reloading and drops an answer that arrives after a newer
request, so a late reply never overtakes a later one. With a `key`, the
answer is kept for the page's life (`lib/resource-cache.ts`): the list
draws at once when you come back, and a write calls `mutate(key, …)` to
show its result before the server confirms, putting it back on refusal.
A list's filters are part of its `View`, so the URL carries them.

## Where state lives

| State | Module | Persists as | Notes |
|---|---|---|---|
| The view in front, the theme, whether the palette is open | `src/lib/store.ts` (zustand) | `app.ui` (theme only) | The view mirrors the URL's hash |
| The person's settings: density, text size, sidebar, system themes | `src/lib/prefs.ts` (zustand) | `app.prefs`, versioned | `migratePrefs` moves old saves forward; `applyUiPrefs` writes `data-density`, the root font size and `--sidebar-w` |
| Data from the API | the component, through `useResource` | nothing | Never in a store |
| The last appearance | `src/themes/apply.ts` | `app.appearance` | Read by `index.html` before the first paint |
| Who is signed in | `src/lib/session.ts` (zustand) | nothing | `me()` on start; a 401 anywhere → signed out → the sign-in view over the app (ADR 0011) |

`src/lib/storage.ts` wraps `localStorage` in try/catch: storage can be
missing or throw, and the app must work without it.

## Themes

`useApplyTheme` (`src/hooks/use-theme.ts`) picks the theme: the one
chosen, or, for `"system"`, the light or dark one in `prefs.systemThemes`
by `prefers-color-scheme`. `applyTheme` (`src/themes/apply.ts`) writes the
theme's colours as inline CSS variables on `<html>`, which win over the
`:root`/`.dark` blocks in `src/index.css`, so no component knows about
themes; it also toggles `.dark`, derives the six tones (`tones.ts`) and
`--destructive-strong`, and stores `app.appearance`. `check:themes` runs
`contrast.ts` over every built-in theme: body and muted text 4.5:1, focus
rings 3:1, the state colours apart from each other, tones readable.

## Views, places and the URL

`View` (`src/lib/store.ts`) is a discriminated union on `kind`.
`routes.ts` maps a view to a hash (`#/projects/p-shop`) and back;
`store.ts` keeps them in step (pushState on a view change, popstate on
back). `App.tsx` switches on `view.kind` under a per-view ErrorBoundary
and Suspense; the other views are `lazyView`s that preload when idle.
`nav.tsx` has one `Place` per kind, in the sidebar's order: the sidebar,
the rail, ⌘1–9 and the palette all read it. TypeScript holds the wiring
together (`satisfies Record<ViewKind, …>`, an exhaustive switch), and
`scripts/check-views.mjs` checks the parts it can't (the route, the round
trip, the axe scene).

## Keys

`shortcuts.json` is the one table. `lib/keys.ts` says which shortcut a
press is (⌘ on a Mac, Ctrl elsewhere, from the browser's platform or
`?platform=`); `hooks/use-shortcuts.ts` does it; the sheet and Settings
list it. Key hints are written for a Mac and `<Kbd>` rewrites them.

## What the browser tests guarantee

`e2e/fixtures.ts` gives every test a fresh browser context on the
production build (`vite preview`), on the fixtures (`?mock=1`), with the
page told it is on Linux (`?platform=linux`, so `mod()` is Ctrl everywhere).
A test fails if the page throws, logs a `console.error` (unless the test
allowed that pattern), asks for anything off its origin, or gets a 4xx/5xx
from its own origin. `retries: 0`. Storage starts empty unless seeded with
`open({ prefs, theme })`. Hooks are `data-testid`s and roles, never text
that moves.

## Modules that run in node

`pnpm test` runs `src/**/*.test.ts` with `node --test --experimental-strip-types`
and no bundler. What those tests import must load as it is: relative
imports with extensions, `@/` only in `import type`, no enum/namespace/
parameter properties, no DOM or `import.meta.env` at load time.
`scripts/check-node-imports.mjs` walks the imports and refuses what node
can't load. Today: `api`, `mock`, `errors`, `explain`, `types`, `routes`,
`keys`, `prefs`, `storage`, `sidebar-width`, `zoom`, `format`, `platform`,
`poll`, `last-of`, and `themes/*`.

## Knobs

| Where | Knob | What it does |
|---|---|---|
| env | `VITE_API_URL` | The HTTP client's base; unset means the mock |
| env | `PORT` | The dev server's port (1420) |
| URL | `?mock=1` | The fixtures, whatever the env says |
| URL | `?api=<url>` | The HTTP client's base, over the env |
| URL | `?slow=1` | Every mock call takes 1.5 s |
| URL | `?fail=1` / `?failOnce=1` / `?failWrites=1` | Every call fails / the first fails / writes fail |
| URL | `?empty=1` | No projects |
| URL | `?crash=<kind>` | That view throws (the error boundary) |
| URL | `?signedOut=1` | Nobody is signed in: the sign-in view (any password signs alex in) |
| URL | `?platform=mac` / `linux` | ⌘ or Ctrl, and how key hints read |
| URL | `?dir=rtl` / `ltr` | The page's writing direction (the layout mirrors) |
| test env | `E2E_PORT`, `E2E_WORKERS`, `E2E_REPORT`, `A11Y_FULL` | The suite's port, workers, HTML/JUnit report, light theme too |
| test env | `THEME_REPORT=1` | `check:themes` prints every margin |

## Vocabulary

| Word | Means |
|---|---|
| view, kind | What the main area shows; `View` in `store.ts`, `kind` is its discriminant |
| place | An entry in the sidebar (`nav.tsx`); `footer` puts it in the bottom group |
| section | A sub-address of a view: a settings section, a Kit section |
| resource | Something read through `Client` and drawn with `useResource` |
| mock, knobs | The fixtures in `mock.ts`, and the URL flags that change them |
| Kit | The `#/kit` page that shows every component; axe checks it in both appearances |
| tone | One of six tag colours (`themes/tones.ts`), kept clear of the state colours |
| state colours | success, warning, destructive, info; `--destructive-strong` is the fill white reads on |
| density | compact or comfortable, as `data-density`; rows read `h-row`, `py-row-pad`, `h-side-row` |
| rail | The folded sidebar: icons only |
| Tip, tip layer | The app's tooltip (`tip.tsx`), never `title=`; a layer shares one tooltip over many rows |
| explain, ErrorNote, toastError | An error in plain words, the raw text behind Details |
| confirm | `confirm()` from anywhere; `ConfirmHost` draws it |
| focus home | `useRescueRemovedFocus`: the keyboard never falls to `<body>` |
| still | `watchStillness`: decorative animations pause while the window is hidden |
| evidence | What a PR shows: tests named, checks pasted, screenshots (`AGENTS.md › Done means`) |
| baselines | `e2e/snapshots/`: every view's picture, Linux's, compared by `e2e/visual.spec.ts`; `pnpm test:visual --update` rewrites them |
| the trial | Walking "Make it yours" on a copy of the template is how the recipes are checked; a gap found there is a doc bug |
