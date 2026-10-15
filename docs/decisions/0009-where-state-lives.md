# 0009: Store, prefs and resources are three different homes

**Status:** accepted, 2026-10-14

**Context.** Apps rot when server data, UI state and settings share one
store: stale caches, settings that reset, and components that can't be
tested alone.

**Decision.** Three homes. `store.ts` holds what the app shows (view,
theme, palette, and a view's filters, so they survive reload and Back),
mirrored to the URL and `app.ui`. `prefs.ts` holds the person's settings,
saved whole under `app.prefs` with a version and a migration. Server data
is read where it is shown with `useResource` and kept by key in
`lib/resource-cache.ts` for the page's life, never in the store: a view
that comes back starts on what was kept and reads again behind, and a
write shows its result at once through `mutate` and goes back if the
server refuses. Storage keys are identifiers: renaming the app doesn't
rename them.

**Consequences.** A reload rebuilds everything from the URL, storage and
the API. A setting change is one `setPrefs` call. Two apps from this
template on the same origin share storage keys unless renamed.

**Revisit if.** The app needs the cache to outlive the page, or
invalidation across tabs (then: a query library, still outside the store).
