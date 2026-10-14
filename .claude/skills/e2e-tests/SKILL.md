---
name: e2e-tests
description: Write or fix Playwright tests in e2e/ that pass on slow CI runners. Use when adding a spec, when a browser test flakes, or when running the suite.
---

# Browser tests (e2e/)

The suite runs the production build in Playwright's Chromium on the mock
fixtures (`?mock=1`), with the page on Linux (`?platform=linux`): the
modifier is Ctrl wherever the suite runs. Import `test`, `expect` and
`mod` from `./fixtures` (Biome refuses `@playwright/test`'s own).

## Running

```sh
E2E_PORT=1427 pnpm test:e2e e2e/thing.spec.ts                    # builds first, then runs; a free port in 1421–1439
E2E_PORT=1427 pnpm test:e2e e2e/thing.spec.ts --repeat-each=5    # before calling a flake fixed
A11Y_FULL=1 E2E_PORT=1427 pnpm test:e2e e2e/a11y.spec.ts         # axe in the light theme too, as CI does
```

`pnpm exec playwright test` alone serves the old `dist/`: always go through `test:e2e` after a change.

## The fixture (`e2e/fixtures.ts`)

- `app.open({ prefs, theme, params })`: a fresh page; `prefs` and `theme` seed storage once; `params` go in the URL (`slow`, `fail`, `failOnce`, `failWrites`, `empty`, `crash`, `platform`).
- `app.nav(id)`, `app.openSettings(section)`, `app.stored(key)`, `mod()` (`Control`, or `mod("mac")`).
- A test fails if the page throws, logs a `console.error` (`app.allowConsoleError(/pattern/)` when that is the behaviour), asks for anything off its origin, or gets a 4xx/5xx. `retries: 0`.
- Hooks: `data-testid` on roots (`sidebar`, `sidebar-rail`, `nav-<id>`, `settings-<id>`, `theme-option[data-theme-id]`, `command-palette`, `projects`, `project-row[data-project]`, `projects-loading|empty|failed`, `project-detail`, `error-note`, `confirm`, `status-bar`, `zoom-hud`, `announce-polite`), roles and names for controls, `[data-slot=toast-title]` for toasts.

## Don't flake

- **Never read state once right after an action.** Use `await expect(locator).toBeVisible()`, `toHaveAttribute`, or `expect.poll(() => …)`, never `expect(await …)` straight after a press or a click.
- **Wait for what you need, not for time.** No `waitForTimeout` (a plugin refuses it). Before axe, wait for `document.getAnimations()` to finish, as `a11y.spec.ts` does.
- **Expect in-between states.** A reload or re-render can show a stale value first; assert the final one within the timeout.
- **Text moves; ids don't.** Locate by `data-testid` or role + name; `exact: true` when a name is a prefix of another.
- **Keys:** `${mod()}+k`, `${mod()}+Shift+Equal`, `Minus`; the page is on Linux unless opened with `params: { platform: "mac" }`.

## A new test

- One behaviour per test, named as a sentence about what the user gets.
- A new state gets a mock knob (`src/lib/mock.ts`), not a stub in the test.
- A new view or dialog gets an axe scene in `a11y.spec.ts` (`check:views` insists for views).
- The fixtures are synthetic ("acme"); add to `FIXTURES` if you need more.
