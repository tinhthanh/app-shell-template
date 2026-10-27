# 0010: The browser suite's contract

**Status:** accepted, 2026-10-14

**Context.** Flakes were the costliest CI failures in Shipyard. A suite
that is trusted must be deterministic and must catch what unit tests
can't: focus, portals, layout, real keyboard events.

**Decision.** Playwright on the production build (`vite preview`), on
the fixtures, `retries: 0`. `e2e/fixtures.ts` fails a test on a page
error, a `console.error` (unless allowed), any request off the origin,
and a 4xx/5xx from the origin; it fixes the platform to Linux so the
modifier is Ctrl everywhere. Tests wait on what they expect, never on
time (a plugin refuses `waitForTimeout`), use `data-testid`s and roles,
one behaviour per test named as a sentence. Axe runs over every view and
state in both appearances.

**Consequences.** A new view needs an axe scene in `e2e/a11y.spec.ts`
and a picture in `e2e/scenes.json` (`check-views` insists on both); a
new state needs a mock knob. The suite is the proof for components, so
there is no DOM test runner.

**Revisit if.** The suite exceeds a few minutes (then: shard, not retry).
