## What the user gets

<!-- One or two sentences, in prose. The title is a lowercase conventional subject: feat: …, fix: …, test: … -->

## Proof

<!-- CI checks these (scripts/check-evidence.mjs). Paste the last lines of each command. -->

- [ ] `pnpm check` is green
- [ ] `E2E_PORT=14xx pnpm test:e2e e2e/<area>.spec.ts` passes for what I touched
- [ ] Every behaviour I changed has a test, named below; a bug fix's test failed before the fix
- [ ] A UI change has screenshots in Default Dark and Default Light below, and its Kit section or axe scene is updated
- [ ] A change to how a view looks updates `e2e/snapshots/` (`pnpm test:visual --update`, or CI's through `node scripts/take-ci-baselines.mjs --take`, said so below), and a new view has its scene in `e2e/scenes.json`; with neither Docker nor a push, the baselines that move are listed under Not done
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

## Assumptions

<!-- What the task left open and you decided: fields, statuses, defaults, where a place sits. "None." if nothing. -->

## Not done

<!-- What you left out of the ask, and why. "Nothing." if it is all there. -->

## Screenshots

<!-- Drag the files from shots/ in here (pnpm shots). An agent that cannot attach files names them here and points at the changed baselines in e2e/snapshots/, which the diff shows. -->

## Guardrail changes

<!-- Only if you changed a guarded path (GUARDRAILS in scripts/check-guardrails.mjs): biome.json, biome-plugins/, scripts/check-*.mjs, playwright.config.ts, anything under .github/, AGENTS.md, CLAUDE.md, anything under .claude/ (the settings and the skills), .githooks/, tsconfig*.json, e2e/fixtures.ts, vite.config.ts, package.json, index.html or deploy/. Say why, and add the "guardrail-change" label. -->
