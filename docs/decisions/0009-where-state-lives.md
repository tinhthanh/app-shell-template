# 0009: Store, prefs and resources are three different homes

**Status:** accepted, 2026-10-14

**Context.** Apps rot when server data, UI state and settings share one
store: stale caches, settings that reset, and components that can't be
tested alone.

**Decision.** Three homes. `store.ts` holds what the app shows (view,
theme, palette), mirrored to the URL and `app.ui`. `prefs.ts` holds the
person's settings, saved whole under `app.prefs` with a version and a
migration. Server data is read where it is shown with `useResource` and
never cached in a store. Storage keys are identifiers: renaming the app
doesn't rename them.

**Consequences.** A reload rebuilds everything from the URL, storage and
the API. A setting change is one `setPrefs` call. Two apps from this
template on the same origin share storage keys unless renamed.

**Revisit if.** The app needs an offline cache (then: a query library,
still outside the store).
