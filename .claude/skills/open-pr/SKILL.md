---
name: open-pr
description: Write and open a pull request that passes this repo's PR gates (evidence, guardrails) the first time — the title, the Proof with pasted output, the tests named, Assumptions and Not done, the changelog bullet, the guardrail-change label. Use when work is finished and is to be pushed, when asked to open or write a PR, or to write PR.md in a trial.
---

# Open a pull request

CI reads the PR as well as the code: `evidence` (`scripts/check-evidence.mjs`)
reads the title, the body and the diff; `guardrails`
(`scripts/check-guardrails.mjs`) reads the diff and the labels. Both run
on your machine first, so nothing is learnt from a red CI.

## 1. Before you write it

- `pnpm check` is green, and `pnpm test:e2e <the specs you touched>` passes; keep the last lines of each to paste.
- A UI change: `pnpm shots '#/…'` (and `--phone`), opened and looked at; the baselines that move are taken (AGENTS.md › Checks) or listed under Not done.
- A user-visible change has a bullet under `## Unreleased` in `CHANGELOG.md`, in the user's words.
- A view kind, a setting, a shortcut: the recipe's tests are all there (AGENTS.md › Which test proves it).
- Committed, then `pnpm ci:local`: CI's app job on a clean copy of HEAD, the browser suite in Linux (Docker), and the two gates below. Green before the push; its summary goes in the Proof. Without Docker, say in the PR that the browser suite ran only here.
- If the change is large, ask the `reviewer` agent (`.claude/agents/reviewer.md`) to read the diff against the rules first.
- Where CI runs locally (`gh variable get CI_MODE` says `local`: a private repository, ADR 0017), `pnpm verify` instead of `pnpm ci:local`: the same run, then the reviewer agent's verdict, recorded in `evidence/`. Green and "ready", commit `evidence/` and push; the pre-push hook and the evidence job refuse a push without it. "Not ready": fix what `evidence/review.md` says, commit, run it again. Its summary goes in the Proof, with the verdict; the review runs before that summary exists, so the Proof may point at `evidence/verify.json` for this run's results.

## 2. The title

A lowercase conventional subject that says what the user gets, not what the code does: `feat: tasks can carry a file`, `fix: a refused save keeps the form open`. `chore:`, `test:`, `docs:`, `ci:`, `refactor:`, `build:` say it isn't user-visible (no changelog bullet needed); a change under `src/` a person would notice is `feat:` or `fix:`, never a `chore:` to dodge the bullet.

## 3. The body

Fill `.github/pull_request_template.md`, every section, in plain words:

- **What the user gets**: one or two sentences.
- **Proof**: tick only what is true; paste the last lines of `pnpm check` and of the Playwright run. A failure you say isn't yours comes with its proof: the same test on `main` (the command and its counts, or a CI link) and an issue.
- **Tests added or changed**: each test by its name, under its file. A change under `src/` with no test possible says so on a line `no-test: <why, in 15 characters or more>`; the gate refuses a no-test line when a test did change.
- **Assumptions**: what the task left open and you decided (fields, statuses, defaults, whose setting it is, where a place sits). A `feat:` without real content here is refused; "None." only when that is the truth.
- **Not done**: what you left out of the ask, and why; each baseline that moves and wasn't taken. "Nothing." only when it is all there.
- **Screenshots**: drag the files from `shots/` in; an agent that cannot attach names them and points at the changed baselines.
- **Guardrail changes**: when the diff touches a guarded path (the list is at the top of `scripts/check-guardrails.mjs`: `.claude/`, `AGENTS.md`, `.github/`, `biome.json`, `scripts/check-*.mjs`, `playwright.config.ts`, `e2e/fixtures.ts`, `package.json`, `vite.config.ts`, `index.html`, `deploy/` and others), say what and why, and add the `guardrail-change` label. Never loosen a check to get a change through: an `ALLOW` entry needs a reason beside it, a `biome-ignore` needs `lint/<rule>: <reason>`.

## 4. Run the gates as CI will

```sh
git fetch origin main
PR_TITLE="feat: …" PR_BODY="$(cat pr.md)" node scripts/check-evidence.mjs
PR_LABELS="guardrail-change" node scripts/check-guardrails.mjs      # the labels you will add
```

## 5. Open it

On a branch, never `main`:

```sh
git push -u origin <branch>                       # pre-push runs pnpm check
gh pr create --base main --title "…" --body-file pr.md [--label guardrail-change]
```

In a trial, or wherever you may not push: write the title and the body into `PR.md` at the root and commit it, on the branch the worktree is on. Its first line is the title as GitHub shows it (`feat: …`, no `#` before it), then a blank line, then the body: the gates and `pnpm verify` read it that way.

Then watch it: `gh pr checks <n>`. When something goes red, the `fix-ci` skill.
