---
name: trial
description: Measure how well this template guides an agent that has never seen it, by giving a fresh agent a product task in a worktree and scoring the result against the repo's rules. Use when asked whether the template is ready for agents, after a batch of rule or skill changes, or to find what to improve next.
---

# The fresh-agent trial

The only honest measure of a template for agents is an agent that has
never seen it. A trial is: a worktree on `main`, a product task written
as an owner would write it, a fresh agent that reads only the repo, then
a second agent that scores the result against the repo's own rules and
says, for every deviation, whether the rule was unclear, missing or
ignored. The findings are template bugs first, agent faults second.
`docs/trials.md` keeps the scores.

## 1. A worktree

```sh
git worktree add ../app-shell-trial -b trial/<task> main
cd ../app-shell-trial && CI=true pnpm install --frozen-lockfile   # its own node_modules, never a symlink
```

Pick a free port in 1421–1439 for its browser tests (`lsof -nP -iTCP:14xx -sTCP:LISTEN`).

## 2. The task

A feature that crosses the recipes: a resource (list, detail, a form
with a choice, a write that shows at once, a delete), a place in the
sidebar and the palette, and a setting. Past tasks: a Tickets area; a
Members area with a Settings "Team" section. Write it as a product
owner would, with the fields and the verbs, and nothing about how.

## 3. The fresh agent

Start it on the worktree, with the repo as its only source. The prompt:

> You are a new engineer joining a frontend repository. Work ONLY inside
> `<worktree>`. Start by reading the repository's own instructions
> (CLAUDE.md / AGENTS.md and whatever they point to) and follow them
> exactly as a careful engineer would. Everything you need is in the repo.
>
> Your task, as a product owner would phrase it: "<the task>"
>
> Rules: use `npx pnpm@11` if pnpm is not on PATH; use `E2E_PORT=<port>`
> for browser tests; never use ports 1420 or 1377–1379; kill only
> processes you started. Do not push and do not open a pull request (so
> the visual baselines can't be taken: do what AGENTS.md › Checks says
> when there is no Docker and no push):
> commit on the branch, and write the PR's title and body (as the
> template asks) into `PR.md` at the root, committed too. Do everything
> the repo says "done" requires and run every check it names.
>
> When finished, report: which files you read before writing code, in
> order; what you built; the exact check commands and their results;
> anything unclear, missing or contradictory in the instructions, or
> that you had to guess; anything that slowed you down. If a check fails
> and you could not fix it, say so.

## 4. The score

A second agent, read-only on the worktree, with the diff
(`git diff main...trial/<task>`) and `PR.md`. Ask it to check, citing
file:line: the recipes (add-resource, add-view, add-form, the settings
recipe); the shared pieces used rather than copied (`FormDialog`,
`optimistic()`, `useReturnFocus`, `DataTable`, `SearchField`, `format.ts`,
`app.open({ hash })`); the AGENTS.md rules; `PR.md` against the template
and the evidence gate (Assumptions and Not done with real content, tests
named, checks pasted, a changelog bullet); anything a reviewer would
reject; and whether the task was narrowed without saying. Ask for: a
score out of 10 with a paragraph; a table of deviations (what, where,
rule, verdict: rule unclear / rule missing / rule ignored / fine); the
top five template improvements that would prevent them.

## 5. Afterwards

- Add a row to `docs/trials.md`: date, task, score, the deviations that
  were the template's fault, the PRs that fixed them.
- Fix the template, not the prompt: a "rule unclear" is a doc bug, a
  "rule missing" wants a shared piece or a recipe step, a "rule ignored"
  wants a check if it matters.
- `git worktree remove ../app-shell-trial --force`; keep the branch if
  its code is worth reading as an example.
- Run the next trial on a different task, so the fixes are measured and
  not memorised.
