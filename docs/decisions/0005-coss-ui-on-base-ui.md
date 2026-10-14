# 0005: The UI kit is coss ui on Base UI, vendored and edited in place

**Status:** accepted, 2026-10-14

**Context.** The shell needs accessible dialogs, menus, popovers,
selects and a sidebar that a small team can own. Shipyard, where this
template comes from, uses coss ui.

**Decision.** `src/components/ui/` is installed from the coss registry
(`components.json`) and edited in place, the shadcn way; it sits on Base
UI (the MUI team's headless primitives; the `render` prop, not
`asChild`). The app's own pieces (`tip`, `confirm`, `error-note`,
`pick-one`…) live beside the kit, not inside it.

**Consequences.** Upgrades are manual diffs; re-adding a component from
the registry overwrites local edits, so diff first. The relaxed a11y
lint rules apply only to the kit. Shipyard's conventions (Tip over
`title=`, the toast stack moving clear of dialogs, focus rescue) are
already in it.

**Revisit if.** coss ui or Base UI stop being maintained.
