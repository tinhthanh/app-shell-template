---
name: add-theme
description: Add or port a colour theme and make it pass the contrast checks. Use when asked for a new theme, a port of an editor theme, or when check:themes fails.
---

# Add a theme

A theme is a `Theme` (`src/lib/types.ts`): an id, a name, `appearance`,
`colors` and the full terminal palette (ANSI 16 plus cursor and
selection; the app only draws `terminal.background`, but ports carry
their whole palette). `pnpm check:themes` holds every built-in theme to
`src/themes/contrast.ts`: text 4.5:1 on every surface, focus ring 3:1,
the four state colours apart from each other and from primary, the six
tones readable (`tones.ts`), white readable on the derived destructive
fill.

1. Write it in `src/themes/builtin.ts` and add it to `ownThemes`, or in `vscode.ts` and `vscodeThemes` for a port. The id is unique (`contrast.test.ts` checks).
2. `THEME_REPORT=1 pnpm check:themes` prints every margin. A colour that fails: move its lightness only, keep hue and chroma, and note it in a `// Nudged:` comment above the theme, as the ports do.
3. A port gets a row in `THIRD_PARTY_NOTICES.md` (source, author, licence).
4. Look at it: `#/kit/tones`, `#/kit/feedback`, `#/kit/buttons` in that theme, and `A11Y_FULL=1 E2E_PORT=1427 pnpm test:e2e e2e/a11y.spec.ts` if it becomes a default.
5. To make it the system default for one appearance: `DEFAULTS.systemThemes` in `src/lib/prefs.ts`, with a `PREFS_VERSION` bump and a `migratePrefs` step.
6. `CHANGELOG.md`: a bullet.

Components never carry a hex: every colour is a token the theme sets.
