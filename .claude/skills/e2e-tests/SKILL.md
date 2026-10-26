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

- `app.open({ prefs, theme, params, hash })`: a fresh page; `prefs` and `theme` seed storage once; `params` go in the URL (`slow`, `fail`, `failOnce`, `failWrites`, `failMore`, `hold`, `empty`, `many`, `crash`, `signedOut`, `sessionMinutes`, `role`, `platform`; `hold` keeps writes unanswered, the way to see what shows before the server confirms, never `slow` and a short timeout; time that must pass, such as a session ending, is `page.clock.install()` before the open and `clock.fastForward(…)` once the app is signed in, never a wait); `hash` is the view to land on (`"/projects/p-shop"`), instead of a hand-built `page.goto`; a test or an axe scene may call it again for another state (with other `prefs`: each open seeds its own, and the same address again is loaded afresh), or to open a shared link (`app.open({ hash: "/projects?tags=mobile" })`). A new address in the same page, without a reload, is `page.evaluate(() => { location.hash = "#/…" })`. It waits for the shell: a sidebar row, Settings' Back to app (`settings-back`: on Settings the sidebar, and its `nav-*` ids, are gone), the phone bar or the sign-in page.
- `app.nav(id)`, `app.openSettings(section)`, `app.stored(key)`, `mod()` (`Control`, or `mod("mac")`).
- A test fails if the page throws, logs a `console.error` (`app.allowConsoleError(/pattern/)` when that is the behaviour), asks for anything off its origin, or gets a 4xx/5xx. `retries: 0`.
- Hooks: `data-testid` on roots (`sidebar`, `sidebar-rail` (the sidebar folded), `sidebar-sheet`, `nav-<id>`, `more-places`, `more-<id>`, `pin-<id>`, `rail-workspace[data-workspace]`, `rail-workspace-dot`, `new-workspace`, `workspace-header`, `projects-column`, `column-project[data-project]`, `notifications`, `notifications-unread`, `notification-centre`, `notice`, `place-badge-<id>[data-count]`, `recent`, `recent-<kind>-<id>`, `recent-fold`, `getting-started`, `status-<id>`, `account`, `phone-bar`, `mock-banner`, `settings-back`, `settings-nav-<id>`, `settings-<id>`, `settings-find`, `theme-option[data-theme-id]`, `kit-<id>`, `command-palette`, `projects`, `project-row[data-project]`, `projects-loading|empty|failed|stale`, `project-missing|forbidden`, `missing` (an unknown address) (`<ResourceView testid>`'s states; `stale` is a reload that failed over kept rows), `nothing-matches`, `more-rows`, `project-detail`, `error-note`, `confirm`, `status-bar`, `zoom-hud`, `announce-polite`), roles and names for controls, `[data-slot=toast-title]` for toasts. `html[data-views-loaded]` says the lazy views' code is in: wait on it before `context.setOffline(true)`, or the background load fails mid-test.

## Don't flake

- **Never read state once right after an action.** Use `await expect(locator).toBeVisible()`, `toHaveAttribute`, or `expect.poll(() => …)`, never `expect(await …)` straight after a press or a click.
- **Wait for what you need, not for time.** No `waitForTimeout` (a plugin refuses it). Before axe, wait for `document.getAnimations()` to finish, as `a11y.spec.ts` does.
- **Expect in-between states.** A reload or re-render can show a stale value first; assert the final one within the timeout.
- **Text moves; ids don't.** Locate by `data-testid` or role + name; `exact: true` when a name is a prefix of another.
- **A timeout under a second** is only for proving "at once" against the slow mock's 1.5 s (`{ timeout: 500 }` beside a comment that says so); everything else waits the default.
- **Keys:** `${mod()}+k`, `${mod()}+Shift+Equal`, `Minus`; the page is on Linux unless opened with `params: { platform: "mac" }`.

## Proving something did not happen

`await expect(toast).toHaveCount(0)` proves nothing: it retries until the
count is 0, and a toast that should not have shown leaves on its own after
a few seconds, so the test passes with the bug in. Wait for a signal that
the work is over, then read once:

```ts
await expect(row.getByRole("button", { name: "Done" })).toBeEnabled();   // the write finished
expect(await app.page.locator("[data-slot=toast-title]").count()).toBe(0); // read once, no retry
```

Give the action a settled state to wait for (a button disabled while its
write runs, a row that changes), and break the code once to see the test
fail before you trust it.

## Screenshots

`e2e/visual.spec.ts` compares every view at a fixed moment (`VISUAL_NOW`, UTC: the fixtures' times are relative, and an old one reads as a date that would move every day), in both default themes, with
the baselines in `e2e/snapshots/` (Linux renderings, so CI's match). It
runs with the suite on Linux; on a Mac, `pnpm test:visual` runs it in the
Playwright Linux image (Docker). When a change means to alter the look,
`pnpm test:visual --update` writes the new baselines: commit them, and
the PR's review sees the pictures. Add a scene to `e2e/scenes.json` for a new view (required: AGENTS.md › A view).

`pnpm shots` writes every desktop scene of `e2e/scenes.json` in Default
Dark and Default Light to `shots/` (gitignored), for a PR's "Proof"
section. `pnpm shots '#/kit/buttons'` takes one address.

## A new test

- One behaviour per test, named as a sentence about what the user gets.
- A new state gets a mock knob (`src/lib/mock.ts`), not a stub in the test.
- A new view or dialog gets an axe scene in `a11y.spec.ts` (`check:views` insists for views).
- The fixtures are synthetic ("acme"); add to `FIXTURES` if you need more.
