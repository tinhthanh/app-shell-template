---
name: add-view
description: Add a view (a page in the main area with a place in the sidebar, an address, a title and tests) to this app. Use when asked for a new page, screen or section of the app.
---

# Add a view

A view is a `kind` of `View`. The compiler and `pnpm check:views` refuse a
half-wired one; this is the order that keeps them green. Start from
`src/views/projects/` for a list-and-detail view over a resource (its
pieces are shared: `ListToolbar`, `SearchField`, `PickOne`, `NothingMatches`,
`DataTable`, `DetailPage`, `FormDialog`, `optimistic()`, `removeRecord()`,
`useReturnFocus`; what you write is the columns, the fields and the
words), or `src/views/home/` for a static one.

1. **`src/lib/store.ts`**: add `{ kind: "reports"; id?: string; q?: string; sort?: string }` to `View`: the list's filters and sort live here, so the address keeps them.
2. **`src/lib/routes.ts`**: a case in `viewToHash` (`#/reports`, `#/reports/<id>`) and in `hashToView`.
3. **`src/lib/routes.test.ts`**: add the view to the round-trip list.
4. **`src/views/reports/reports-view.tsx`**: the component, with `data-testid="reports"` on its root and a `<ViewHeader title>`. Reads go through `useResource` (keyed) and `<ResourceView>`, which draws loading, failed with Try again, and the empty state you give it.
5. **`src/App.tsx`**: a `lazyView(() => import("@/views/reports/reports-view").then((m) => m.ReportsView))`, a case in `ViewFor`, and `reports: t("shell.place.reports")` in `viewTitles` (a function, so the window's title is in the language in use).
6. **`src/lib/nav.tsx`**: an entry in `PLACES` before `kit` (a product place goes before Kit, which stays last of the top group; ⌘1–9 follow the order, so Kit's key moves: say so in the changelog; `shell.spec.ts` reads the order from the sidebar, so it keeps passing). A new place changes the sidebar in every desktop picture: retake the baselines with `pnpm test:visual --update` (Docker) and commit them.
7. **`e2e/a11y.spec.ts`**: a scene `{ id: "reports", run: … }`, and one per state worth checking; a scene opens its state with `app.open({ params, hash })`, never a hand-built address. A scene in `e2e/scenes.json` gives it a screenshot baseline and a place in `pnpm shots`.
8. **A behaviour test** in `e2e/reports.spec.ts`: what the user gets, on the mock knobs.
9. **The words**: every word the view shows is `t("reports.…")` from a new `src/lib/messages/reports.ts` (`en`, then `vi` with the same keys and blanks), spread into `src/lib/messages/index.ts`; the place's label is a `shell.place.<kind>` key in `nav.tsx` and `viewTitles` in `App.tsx`. A word that a constant holds (columns, options) is read in render, so a change of language reaches it.
10. **`CHANGELOG.md`**: a bullet under Unreleased.

Then `pnpm check` (typecheck, lint, `check:views`) and
`E2E_PORT=1427 pnpm test:e2e e2e/reports.spec.ts e2e/a11y.spec.ts`.

A settings section instead: `SettingsSectionId` in `store.ts`, `SECTIONS`
in `routes.ts` and `settings-view.tsx`, a component of `SettingsPage`,
`SettingsGroup`, `SettingsRow` (`rows.tsx`), its line in Find a setting's
`INDEX` (`src/views/settings/find.tsx`) with `settings.findWords.<id>` in
every language (`src/lib/messages/settings.ts`), and a `settings <id>`
scene. Settings is a page of its own that takes the sidebar's place, so
there the sidebar's `nav-*` ids are gone: a test reaches a section with
`app.openSettings("<id>")` (it clicks `settings-nav-<id>`), and leaves
through `settings-back`.
