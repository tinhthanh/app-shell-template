# Working on this app

A frontend-only React app: Vite 8, React 19, Tailwind 4, coss ui on Base
UI, zustand, Playwright. There is no backend here; the views read through
`src/lib/api.ts`, which runs on the fixtures in `src/lib/mock.ts` unless
`VITE_API_URL` is set.

## Checks

Run these before you call something done:

```sh
pnpm typecheck && pnpm check:titles && pnpm check:themes && pnpm test && pnpm build
E2E_PORT=1427 pnpm exec playwright test e2e/x.spec.ts   # the specs you touched
```

CI (`.github/workflows/ci.yml`) runs all of it, the whole browser suite
included.

## Rules

- **Ports:** 1420 is the dev server. Playwright uses `E2E_PORT` in
  1421–1439; check the port is free first.
- **New unit test files** go into `package.json`'s `"test"` script list.
- **No `title=` attributes** (`check:titles`); use `<Tip>`.
- **Fixtures are synthetic** ("acme"). Nothing real goes in `src/lib/mock.ts`.
- **No secrets** in code, URLs or logs. Configuration goes through `VITE_*`
  env vars (`.env.example`).
- **Density and tokens:** rows use `h-row`/`py-row-pad`/`h-side-row`;
  colours use the theme's tokens or a tone, never a hard-coded hex.
- **Reads go through `useResource`** and draw loading, failed and loaded.
- **Browser tests** wait on what they expect (`expect(...).toBeVisible()`,
  `expect.poll`), never on time, and never reach off the page.

## Adding things

- A view: `View` in `src/lib/store.ts`, a `lazyView` in `App.tsx`, a place
  in `src/lib/nav.tsx`.
- A setting: a field in `Prefs` (`src/lib/prefs.ts`), a row in a section
  under `src/views/settings/`; bump `PREFS_VERSION` when a default changes.
- A shortcut: `src/lib/shortcuts.json`, then `idOf` and `run` in
  `src/hooks/use-shortcuts.ts`.
- A theme: `src/themes/builtin.ts`; `pnpm check:themes` must pass.
- A resource: a type in `src/lib/types.ts`, methods on `Client` in
  `src/lib/api.ts`, fixtures in `src/lib/mock.ts`, a test in
  `src/lib/mock.test.ts`.

## Commits

Lowercase conventional (`feat: …`, `fix: …`, `test: …`); the subject says
what the user gets, in prose.
