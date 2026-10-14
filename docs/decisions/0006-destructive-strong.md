# 0006: A derived fill for destructive buttons

**Status:** accepted, 2026-10-14

**Context.** Each theme's `destructive` colour is tuned to read as text
and as a dot: 3:1 on the page. White text on it is 3.4:1 in Default Dark
and worse in Dracula; axe failed the Kit's buttons page.

**Decision.** `applyTheme` derives `--destructive-strong` with
`strong()`: the theme's destructive darkened until white reads on it at
4.5:1. Destructive buttons and badges fill with it; text keeps
`destructive`/`destructive-foreground`. `check:themes` asserts the
derivation for every theme.

**Consequences.** Themes don't declare the fill; it can't drift out of
contrast. The fill is a little darker than the theme's red.

**Revisit if.** A theme wants a fill of its own (then: an optional
`destructiveStrong` colour that `strong()` falls back from).
