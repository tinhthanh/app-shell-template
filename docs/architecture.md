# How the app is put together

A map for someone, or some agent, dropped in with one task. The code's
file headers say what each module is for; this says how they connect.
`AGENTS.md` has the rules; `docs/decisions/` has the reasons.

## A read, end to end

```
view            useResource((signal) => client.project(id, { signal }), [id])   src/lib/resource.ts
                usePages((page) => client.projects({…filters, …page}), { key })   a list, a page at a time
  └─ client     mockClient() | httpClient(VITE_API_URL)       src/lib/api.ts, src/lib/mock.ts
       └─ answers with data, or throws ApiError(message, status, code)   src/lib/errors.ts
<ResourceView>  loading   → <PixelLoader>                      src/components/resource-view.tsx
                failed    → <ErrorNote error onRetry>          src/components/error-note.tsx (lib/explain.ts)
                ready     → empty, or the data through children
                (the status is a union: lib/resource-state.ts has the transitions)
a write         optimistic({ key, listKey, id, patch, write: () => client.updateProject(id, patch) })   src/lib/resource-cache.ts
                shown at once, put back and toastError on refusal
                a 422 with code "invalid" lands on the field   views/projects (the edit form)
```

`client` is chosen once, at load (the fixtures' code comes as its own
chunk, at the first call, only in mock mode), by `isMock()` in
`src/lib/api.ts`: the fixtures when the host's `config.js`
(`window.__APP_CONFIG__`) says `mock: true`, when no API is configured
(no `?api=`, `apiUrl` in `config.js` or `VITE_API_URL`), or when the URL
says `?mock=1`; else HTTP. The URL may choose (`?mock=1`, `?api=`) only
while the knobs are on (`knobsOn()`): in a dev build, or one built with
`VITE_KNOBS=1`. A production build ignores them, so a link can't point
the app at another server. Views never call
`fetch` (Biome refuses it outside `api.ts`). `useResource` keeps the old
data while reloading and drops an answer that arrives after a newer
request, so a late reply never overtakes a later one. With a `key`, the
answer is kept for the page's life (`lib/resource-cache.ts`): the list
draws at once when you come back, and a write calls `mutate(key, …)` to
show its result before the server confirms, putting it back on refusal.
A list's filters are part of its `View`, so the URL carries them.

A list that can grow (Projects) is read a page at a time with `usePages`:
the server filters and sorts and answers a `Page` (`items`, `next`,
`total`; `lib/pages.ts`), each filter and sort is kept under its own key
(`projects?status=active`), `<DataTable more total>` asks for the next
page as its last rows come on screen and says when one fails, and
`optimistic()` and `removeRecord()` change a paged list's rows as they do
a whole one's. Coming back, the first read asks for as many rows as were
kept, so the row the keyboard left (`focusRow`) is still there. A short,
bounded list (the tags in use) is read whole with `useResource`.

A list is a workspace's: `listOf` (`views/projects/projects-view.tsx`)
puts the workspace on show (`prefs.workspace`, `lib/workspace.ts`) in the
query, so it is in the key too, and another workspace is another list. A
write reaches every kept list of its resource (`listsOf` in
`lib/resource-cache.ts`: `projects`, `projects?status=active`…), so a
filter you come back to doesn't show the old row.

## Where state lives

| State | Module | Persists as | Notes |
|---|---|---|---|
| The view in front, the theme, whether the palette is open | `src/lib/store.ts` (zustand) | `app.ui` (theme only) | The view mirrors the URL's hash |
| The person's settings: density, text size, sidebar (folded, width, the places on the rail), system themes, language, the last What's new seen, the workspace on show, Recent, the folded sections, the getting-started steps | `src/lib/prefs.ts` (zustand) | `app.prefs`, versioned | `migratePrefs` moves old saves forward; `applyUiPrefs` writes `data-density`, the root font size and `--sidebar-w` |
| Data from the API | the component, through `useResource` | nothing | Never in a store |
| The last appearance | `src/themes/apply.ts` | `app.appearance` | Read by `index.html` before the first paint |
| Who is signed in | `src/lib/session.ts` (zustand) | nothing | `me()` on start; a 401 anywhere → signed out → the sign-in view over the app (ADR 0011); their `role` and `useCan(action)` say what they may do (`lib/permissions.ts`, ADR 0012) |
| The frame's: the workspaces, the notices, the place counts, the status items | `lib/workspace.ts`, `lib/notifications.ts`, `lib/badges.ts`, `lib/status-items.ts` (zustand) | nothing | Small stores the frame draws from (ADR 0009); each forgets itself on sign-out through `onSignedOut` (`lib/session.ts`), as the resource cache does, and the workspace pick and Recent go with them |

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

## The frame

The sidebar is a rail beside a sheet (`components/sidebar-rail.tsx`,
`components/app-sidebar.tsx`). The rail has the places pinned to it
(`prefs.railPlaces`, the rest under its "…"), the person's workspaces as
tiles and Settings. The sheet has the workspace on show (`WorkspaceHeader`),
search, and the open place's own list: `SidebarSheet` picks it by the view's
kind (Projects' is `views/projects/projects-column.tsx`, lazy, keyed as the
list is so it follows its read rather than making its own), and Recent
for any other place. ⌘\ folds the sheet away; a narrow window shows only
the rail. The workspace on show is a preference, not part of the address
(ADR 0014).

Views tell the frame things; they never draw in it. `notify()`
(`lib/notifications.ts`) is a toast now and a line in the bell, unread
until looked at. `setPlaceBadge(placeId, n)` (`lib/badges.ts`) is a count
on a place, a dot or, when loud, a number, and part of the place's name.
`useStatusItem({ id, label, tip })` (`hooks/use-status-item.ts`) is a fact
in the status bar while the component is mounted; an id is one item.
`withRecent` (`lib/recent.ts`) puts an opened record in Recent, and the
`after` a view gives `removeRecord` takes a deleted one out (as
`projects-view.tsx` does). Home's getting-started
list is `STEPS` in `lib/onboarding.ts`: a step is an id, its words
(a `shell.onboarding.*` key, in every language) and a `markStep(id)` where
the person does it.

## Keys

`shortcuts.json` is the one table. `lib/keys.ts` says which shortcut a
press is (⌘ on a Mac, Ctrl elsewhere, from the browser's platform or
`?platform=`); `hooks/use-shortcuts.ts` does it; the sheet and Settings
list it. Key hints are written for a Mac and `<Kbd>` rewrites them.
Each shortcut's name is a word, `settings.shortcut.<id>` (`describe` in
`lib/shortcuts.ts`).

## Settings

Settings is a page of its own: on a desktop its list of sections takes
the sidebar's place (`settings-view.tsx`), with a way back
(`settings-back`, or Esc) that calls `closeSettings()` (`lib/store.ts`)
and returns to the view it was opened from. Find a setting
(`views/settings/find.tsx`) sits at the top of every section and matches
what is typed against each section's name and its `settings.findWords.<id>`
in the language in use; a new section gets a line in its `INDEX`.

## Words

Every word a person reads goes through `t()` (`lib/i18n.ts`, ADR 0013):
a key in `lib/messages/<area>.ts`, English first and Vietnamese typed
against it, so a missing word fails to compile. `t()` is called in
render, never at module load, so a change of language (the Language
setting in `lib/prefs.ts`) reaches every word; dates, numbers and money
follow it through `lib/format.ts`. `pnpm check:words` refuses English
written straight into a view or a component (the Kit page excepted).

## Permissions

What a person may do is one table, `ACTIONS` in `lib/permissions.ts`
(ADR 0012): an action and the roles that may take it. A view asks
`useCan("project.delete")` (`lib/session.ts`) and leaves out what isn't
theirs; the mock refuses the same with a 403 (`?role=viewer`), as a
server would. Hiding a button is a courtesy; the server decides.

## Type and the grid

Text is sized by its role on the type scale in `src/index.css`
(`text-page-title`, `text-title`, `text-heading`, `text-body`, `text-row`,
`text-meta` and the rest), never `text-sm` or a pixel size;
`pnpm check:type` holds it. The layout grid beside it gives every top band
`h-bar`, a page's gutter `px-page`, and a column's boxes and their content
`px-edge` and `px-lane`, so lines meet across the sidebar, a view's header
and Settings; `pnpm check:grid` holds that. Both are in rem, so they grow
with the text size.

## Marks on a row

`StatusBadge` and `Tag` (`components/status-badge.tsx`) are the two small
marks a row wears: a record's state, in a tone the view names (`success`,
`warning`, `info`, `destructive`, `muted`) with its word, and a tag, in one
of the six tones, the same for a name every time.

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

`pnpm test` runs `src/lib/**/*.test.ts` and `scripts/*.test.mjs` with
`node --test --experimental-strip-types` and no bundler; the themes'
contrast test runs the same way under `pnpm check:themes`. What those
tests import must load as it is: relative imports with extensions, `@/`
only in `import type`, no enum/namespace/parameter properties, no DOM or
`import.meta.env` at load time. `pnpm check:node`
(`scripts/check-node-imports.mjs`) walks the imports from every test and
refuses what node can't load; it, not a list here, says which modules
run in node.

## Knobs

The URL knobs that choose where the app reads from (`?mock=1`, `?api=`)
work only while the knobs are on: a dev build, or one built with
`VITE_KNOBS=1`. The mock's own knobs (`?slow=1` to `?failMore=1`) change
the fixtures whenever the app runs on them. `?crash=` works on the
fixtures or with the knobs on.

| Where | Knob | What it does |
|---|---|---|
| env | `VITE_API_URL` | The HTTP client's base; unset (and no `apiUrl` in `config.js`) means the mock |
| env | `VITE_KNOBS=1` | Keeps `?mock=1`, `?api=` and `?crash=` in a production build, for a demo; never on a build that talks to a real API |
| env | `PORT` | The dev server's port (1420) |
| env | `BASE_PATH` | An absolute base for the built assets (`vite.config.ts`); relative (`./`) by default |
| env | `SOURCEMAPS=1` | Hidden source maps in the build, for an error reporter (`docs/deploy.md`) |
| config.js | `apiUrl`, `mock` | Set by the host after the build (`window.__APP_CONFIG__`): the API's base, over `VITE_API_URL`, or `mock: true` for the fixtures |
| URL | `?mock=1` | The fixtures, whatever the env says (knobs on) |
| URL | `?api=<url>` | The HTTP client's base, over `config.js` and the env: a path, this origin or localhost only (`urlApi`; knobs on) |
| URL | `?slow=1` | Every mock call takes 1.5 s |
| URL | `?fail=1` / `?failOnce=1` / `?failWrites=1` | Every call fails / the first fails / writes fail |
| URL | `?failMore=1` | The list's second page fails once, then comes (Try again) |
| URL | `?failAfter=2` | The first calls work, every one after fails: a server that goes down while you work (a reload keeps the rows, with a note) |
| URL | `?empty=1` | No records (projects, and whatever else the mock holds) |
| URL | `?many=1` | 5,000 invented projects, for the list's scrolling and keys |
| URL | `?role=viewer` / `member` / `owner` | Who is signed in has that role; the writes it can't take are refused with a 403 (`lib/permissions.ts`) |
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
| StatusBadge, Tag | A record's state in a state colour, and a tag in a tone (`components/status-badge.tsx`) |
| t(), key, messages | A word in the person's language: `t("shell.place.home")`, from `lib/messages/<area>.ts` (`lib/i18n.ts`, ADR 0013) |
| action, useCan | Something a role may do (`ACTIONS` in `lib/permissions.ts`), and the hook a view asks (ADR 0012) |
| type scale | The text sizes by role (`text-title`, `text-row`…) in `index.css`; `check:type` |
| grid | `h-bar`, `px-page`, `px-edge`, `px-lane`: where bands and gutters fall (`index.css`); `check:grid` |
| Find a setting | The search at the top of Settings (`views/settings/find.tsx`), over each section's `settings.findWords.<id>` |
| closeSettings | Leaves Settings for the view it was opened from (`lib/store.ts`) |
| state colours | success, warning, destructive, info; `--destructive-strong` is the fill white reads on |
| density | compact or comfortable, as `data-density`; rows read `h-row`, `py-row-pad`, `h-side-row` |
| Tip, tip layer | The app's tooltip (`tip.tsx`), never `title=`; a layer shares one tooltip over many rows |
| Notice, notification centre | `notify()` (`lib/notifications.ts`): a toast now and a line in the sidebar's bell, with a way back |
| Place badge | A count beside a place in the sidebar, `setPlaceBadge()` (`lib/badges.ts`); loud when it wants the person |
| Status item | A fact a view puts in the status bar, `useStatusItem()` (`lib/status-items.ts`); offline is one |
| Rail, sheet | The sidebar's two columns: the rail of places and workspaces (`sidebar-rail.tsx`), the sheet of the workspace and the place's own list |
| Workspace | What the person belongs to; every list reads the one on show (`lib/workspace.ts`), the rail switches it |
| Recent | The sidebar's section of the records opened last (`lib/recent.ts`, kept in prefs), folded by its heading |
| Getting started | Home's first steps (`lib/onboarding.ts`), each ticked by doing it, put away for good by its close button |
| explain, ErrorNote, toastError | An error in plain words, the raw text behind Details |
| confirm | `confirm()` from anywhere; `ConfirmHost` draws it |
| ListToolbar, NothingMatches, DetailPage, removeRecord | The shape of a list view and a record's page, shared (`components/list-page.tsx`, `detail-page.tsx`, `remove-record.ts`) |
| FormDialog | A form in a dialog with the dirty check, busy state and field errors done (`components/form-dialog.tsx`) |
| optimistic | `optimistic()` in the resource cache: a write shown before the server confirms it, put back on refusal |
| return focus | `returnFocusTo`/`useReturnFocus`: Back lands on the row the person left |
| focus home | `useRescueRemovedFocus`: the keyboard never falls to `<body>` |
| still | `watchStillness`: decorative animations pause while the window is hidden |
| evidence | What a PR shows: tests named, checks pasted, screenshots (`AGENTS.md › Done means`) |
| scenes | `e2e/scenes.json`: the addresses and ready marks that `visual.spec.ts` and `pnpm shots` share |
| baselines | `e2e/snapshots/`: every view's picture, Linux's, compared by `e2e/visual.spec.ts`; `pnpm test:visual --update` rewrites them |
| the trial | A fresh agent on a product task in a worktree, scored against the rules (`.claude/skills/trial`, `docs/trials.md`); a gap found there is a template bug |
