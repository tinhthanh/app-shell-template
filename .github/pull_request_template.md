## What the user gets

<!-- One or two sentences, in prose. The title is a lowercase conventional subject: feat: …, fix: …, test: … -->

## Proof

<!-- CI checks these (scripts/check-evidence.mjs). Paste the last lines of each command. -->

- [ ] `pnpm check` is green
- [ ] `E2E_PORT=14xx pnpm test:e2e e2e/<area>.spec.ts` passes for what I touched
- [ ] Every behaviour I changed has a test, named below; a bug fix's test failed before the fix
- [ ] A UI change has screenshots in Default Dark and Default Light below, and its Kit section or axe scene is updated
- [ ] `CHANGELOG.md` has a bullet under `## Unreleased` (or the title says it isn't user-visible)

```
# pnpm check
```

```
# playwright test
```

**Tests added or changed**

-

<!-- If no test is possible, say why on one line, starting with "no-test: " (at least 15 characters). -->

## Screenshots

## Guardrail changes

<!-- Only if you changed biome.json, the plugins, scripts/check-*, the Playwright config, the workflows, AGENTS.md or CLAUDE.md: say why, and add the "guardrail-change" label. -->
