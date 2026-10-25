# 0003: Unit tests run in node with strip-types, no bundler

**Status:** accepted, 2026-10-14

**Context.** Pure logic (routes, prefs migrations, the mock, colour maths,
the key mapper) deserves tests that start in milliseconds and need no
test framework, DOM or transform pipeline.

**Decision.** `pnpm test` is `node --test --experimental-strip-types` over
`src/lib/**/*.test.ts` and `scripts/*.test.mjs` (the themes' contrast
test, `src/themes/contrast.test.ts`, runs the same way under
`pnpm check:themes`). A module those tests load must run as it is:
relative imports with extensions, `@/` only in `import type`, no enum,
namespace or parameter properties, no DOM or `import.meta.env` at load.
`tsconfig` sets `erasableSyntaxOnly` and `verbatimModuleSyntax`, and
`scripts/check-node-imports.mjs` walks the imports. Components and views
(`.tsx`) are never unit-tested: Playwright on the real build is their
proof (ADR 0010).

**Consequences.** Zero test dependencies, and the suite starts in milliseconds. A `.tsx`
can't be imported by a test. Logic that wants a unit test lives in
`src/lib`, not in a component.

**Revisit if.** Tests need a DOM (then Vitest + browser mode, not jsdom).
