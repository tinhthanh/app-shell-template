---
name: fix-ci
description: Find out why a pull request's CI is red and fix it — a failed check, a browser test, a changed picture, the evidence or guardrails gate — running only what failed. Use when CI fails, when a PR shows a red check, or when asked why a build is broken.
---

# Fix a red CI

CI says what failed in words before you open a log: the `app` job writes
the failed step and every failed browser test, with the command to run
it, into the job summary and into one comment on the PR
(`scripts/ci-failures.mjs`, `scripts/ci-comment.mjs`). Start there.

## 1. What failed

```sh
gh pr checks <n>                                  # which job: app, evidence, guardrails, CodeQL
gh pr view <n> --comments                         # CI's own comment: the failed step, the tests and how to run them
gh run view <run-id> --log-failed | tail -80      # the log, when the comment isn't enough
```

## 2. By job

- **app, a check step** (typecheck, lint, `check:*`, `test`, `test:coverage`, build, `check:size`): run that step alone (`pnpm lint`, `pnpm check:words`…), fix, then `pnpm check`. Coverage is `pnpm test:coverage`: give the module that dropped it its own test, not a test elsewhere that lifts the total.
- **app, the browser suite**: the comment names each test as `e2e/x.spec.ts:LINE`. Run only that one (`pnpm test:e2e e2e/x.spec.ts:LINE`), and `--repeat-each=10` on it alone if it passes once: CI runs with 2 workers on a slower machine, so a race shows there first. The `e2e-tests` skill has the rules that keep tests steady; the run's traces are in its `e2e-report` artifact (`gh run download <run-id> -n e2e-report`).
- **app, a picture** (`visual.spec.ts`): the change moved a scene. If it meant to, take CI's renderings: `node scripts/take-ci-baselines.mjs` lists each diff; look at every one; `--take` copies them over `e2e/snapshots/`; commit them and say in the PR they are CI's and what each shows. If it didn't mean to, the diff shows what broke.
- **evidence**: it says what is missing in one line: a test for a change under `src/` (or a `no-test:` line), a changelog bullet, the title's form, a `feat:`'s Assumptions or Not done. Fix the PR's text with `gh pr edit <n> --title … --body-file …`. CI doesn't run on an edit, and a re-run reads the PR as it was when the run started, so `gh run rerun` won't see it: the next push will, or a label taken off and put back (`gh pr edit <n> --remove-label guardrail-change` then `--add-label`), which starts a new run.
- **guardrails**: a `test.skip`, `test.only`, `test.fixme`, `@ts-ignore`, `@ts-expect-error` or a bare `biome-ignore` added: take it out and fix the cause. A guarded file changed: if the change is meant, say why under Guardrail changes and add the `guardrail-change` label; never edit the check to let it through.

## 3. When it isn't yours

A test that fails on `main` too: run it there (`git stash; pnpm test:e2e e2e/x.spec.ts:LINE --repeat-each=30; git stash pop`), put the command and its counts in the PR, and open an issue with what you ruled out. Two guesses that don't explain a failure that isn't yours are the end of it: note, issue, move on.

## 4. Push the fix

A new commit, never `--no-verify` and never a force push. Then `gh pr checks <n>` again.
