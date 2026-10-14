# The UI kit

Installed from the coss ui registry (`components.json`, `@coss`) and
edited in place, the shadcn way; built on Base UI (`render`, not
`asChild`). Re-adding a component with the registry CLI overwrites local
edits, so diff first. The app's own pieces (tip, confirm, error-note,
pick-one, filter-chip…) live one folder up, not here. The relaxed a11y
lint rules apply only to this folder (`biome.json` overrides). See
`docs/decisions/0005-coss-ui-on-base-ui.md`.
