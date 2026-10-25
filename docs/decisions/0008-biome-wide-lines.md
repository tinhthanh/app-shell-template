# 0008: Biome, at a line width of 200

**Status:** accepted, 2026-10-14

**Context.** One fast tool for lint and format, already in Shipyard. JSX
class lists and one-line objects read better unwrapped, and diffs stay
small when a long line is edited in place.

**Decision.** Biome 2 (pinned) with `preset: recommended`, warnings fail,
`lineWidth: 200`, imports organised. Conventions that Biome can state are
Biome rules (restricted globals and imports, the `useResource`
dependency option); the rest are GritQL plugins in `biome-plugins/` (no
hex, no palette classes, no `waitForTimeout`, no physical sides such as
`left`/`right` outside the kit: `no-hex-colour`, `no-palette-class`,
`no-wait-for-timeout`, `no-physical-sides`) or scripts in `scripts/`.

**Consequences.** Don't hand-wrap. A rule relaxed for the vendored kit
stays relaxed only there (`overrides`). Changing `biome.json` is a
guardrail change (label, code owner).

**Revisit if.** Biome drops GritQL plugins, or ESLint becomes needed for
a rule Biome can't express.
