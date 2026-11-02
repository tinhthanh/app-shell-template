---
name: add-setting
description: Add a setting (a person's own choice kept in this browser, or a workspace's kept on the server), with its row in Settings, its default, its migration and tests; also a setting that is a list's default filter, or a new Settings section. Use when asked for a preference, an option, a toggle in Settings, or "remember my choice".
---

# Add a setting

"Hide done tasks" (Settings › General) is the worked example from end to end:
`hideDoneTasks` in `src/lib/prefs.ts`, its row in
`src/views/settings/general-section.tsx`, `withDefault` in
`src/views/tasks/tasks-view.tsx`, and its tests in `src/lib/prefs.test.ts`,
`e2e/settings.spec.ts` and `e2e/tasks.spec.ts`. Read those before you write.

## 0. Whose setting is it?

- **The person's own** (density, language, "hide done tasks" for me): a pref, in this browser. Go on with 1.
- **The workspace's or the team's** ("the workspace's currency", "the team's default"): the server's. A field on `Workspace` (`src/lib/types.ts`, `api/openapi.json`, `scripts/contract.mjs`), a write behind an action such as `workspace.edit` in `ACTIONS` (`src/lib/permissions.ts`), read through `useWorkspaces`; the `add-resource` skill has the steps for the client, the mock and the contract. Only where there is no server to own it yet is it a pref keyed by the workspace (`prefs.<x>ByWorkspace[id]`), and the PR says so under Assumptions.

## 1. The pref (`src/lib/prefs.ts`)

1. A field on `Prefs`, with a comment that says what it does and who reads it.
2. Its default in `DEFAULTS`.
3. Held to its shape in `fromSaved`: a save from an older build or another tab is never trusted as it is. A boolean is `saved.x === true`; a pick-one falls back to the default when the saved value isn't an option; a number is clamped (`sidebarWidth`); a nested object is merged (`systemThemes`).
4. No `PREFS_VERSION` bump for a new field: the spread fills its default in. Bump it, with a `migratePrefs` step, only when an existing default changes in a way an old saved value shouldn't override.
5. `applyUiPrefs` only if it changes layout (sizes, density).

## 2. Its proof (`src/lib/prefs.test.ts`)

One test, named as a sentence: the default; an old save without the field gets the default; a malformed save falls back (`fromSaved({ x: "yes" as never, version: 1 })`). As "Hide done tasks is off by default, off for an old save, and only true is on".

## 3. The row

- A `SettingsRow` (`src/views/settings/rows.tsx`) inside a `SettingsGroup` of the section it belongs to, never a card of its own. A switch is `Switch` with `checked`, `onCheckedChange={(on) => setPrefs({ x: on })}`, an `aria-label` and a `data-testid`; a choice of a few is `PickOne`; of many, `SimpleSelect`.
- Its words: `settings.<section>.<x>` and `…Description` in `src/lib/messages/settings.ts`, in English and in Vietnamese (a missing one fails to compile).
- **Find a setting**: add the words someone would type for it to `settings.findWords.<section>`, in both languages. Find matches a section's name and those words only, so a row whose words aren't there can't be found.

## 4. A list's default filter

When the setting is what a list shows by default (hide done, only mine):

- The list's filter is on its `View` (`src/lib/store.ts`), written in the address by `src/lib/routes.ts` (`done=show|hide`), with its round trip in `routes.test.ts`.
- The list writes the setting into its address when it opens with no say on it: `const defaulted = withDefault(view, "done", hideDone ? "hide" : undefined, ["status"])` (`src/lib/default-filter.ts`), then `setView(defaulted, { replace: true })` in an effect, and reads `defaulted ?? view` from the first render, so the hidden rows never flash by. The address always says what the list shows; a link means the same to everyone.
- The list's own chip writes `show` or `hide`: what the person does in the list beats the setting.
- Tests: the list opens without them and the address says so; a link that says `show` shows them whatever the setting (`e2e/tasks.spec.ts`).

## 5. The browser test (`e2e/settings.spec.ts`)

The setting is kept: open `app.openSettings("<section>")`, change it, read `app.stored("app.prefs")`, and show the effect it has elsewhere. As "Hide done tasks is kept, and the Tasks list then opens without them". Seed a pref in another test with `app.open({ prefs: { x: … } })`, not by clicking.

## A new section

`SettingsSectionId` in `src/lib/store.ts`; `SECTIONS` in `src/lib/routes.ts` and in `src/views/settings/settings-view.tsx`; a component made of `SettingsPage`, `SettingsGroup` and `SettingsRow`; its line in `INDEX` (`src/views/settings/find.tsx`) with `settings.section.<id>` and `settings.findWords.<id>` in every language; a `settings <id>` scene in `e2e/a11y.spec.ts`. A test reaches it with `app.openSettings("<id>")`; Settings takes the sidebar's place, so the `nav-*` ids are gone there and the way out is `settings-back`.

## Done

`pnpm check`, `pnpm test:e2e e2e/settings.spec.ts` (and the list's spec), `pnpm shots '#/settings/<section>'` and look at it, a `CHANGELOG.md` bullet, and the PR's Assumptions say whose setting it is and its default.
