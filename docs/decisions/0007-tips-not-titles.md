# 0007: Tooltips are `<Tip>`, never `title=`

**Status:** accepted, 2026-10-14

**Context.** The HTML `title` tooltip shows late, in the OS's style, and
never on keyboard focus; an icon button whose only name is its `title`
has none for a keyboard user.

**Decision.** `<Tip label>` (`src/components/tip.tsx`) wraps the element
and shows on hover and on keyboard focus alike; a tip layer shares one
tooltip over many rows. `scripts/check-titles.mjs` refuses `title=` on
anything interactive or iconic, by AST; plain truncated text and iframes
may keep one.

**Consequences.** An icon's meaning goes in a `Tip` and an `aria-label`.
The check's `ALLOW` map stays empty unless there is no way round it.

**Revisit if.** Never, probably.
