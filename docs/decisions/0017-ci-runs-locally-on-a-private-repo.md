# 0017: Where Actions minutes cost, CI runs on a laptop, reviewed, and says so

**Status:** accepted, 2026-11-05

**Context.** A repository made from this template is often private, and on
GitHub Free a private repository pays for Actions past a small allowance,
gets no rulesets (nothing stops a red pull request merging) and no CodeQL.
The app job is most of the minutes: the build and the browser suite with
axe, several minutes a push. rang-sang, made from this template, turned CI
off for this (its ADR 0023) and records a local run instead, but nothing
there runs the reviewer agent, and its pre-push hook only warns.

**Decision.** The repository variable `CI_MODE=local` (`node
scripts/setup-repo.mjs` sets it on a private repository) skips the app job.
`pnpm verify` (`scripts/verify.mjs`) is its stand-in: `pnpm ci:local` (the
app job on a clean copy of HEAD, the suite in CI's Linux, both gates), then
Claude Code's reviewer agent on the branch's diff, read-only (`claude -p
--agent reviewer`, its tools named), answering with a verdict. It writes
`evidence/review.md` and `evidence/verify.json`: the commit, a hash of every
tracked file but `evidence/`, each step's mark, the verdict. `pnpm
check:proof` (`scripts/check-proof.mjs`) fails unless the record is this
tree's, every step green and the verdict "ready"; the pre-push hook runs it
when `CI_MODE` is `local`, and so does the evidence job on the pull
request's head. The evidence and guardrails jobs still run: seconds each.
A public repository, this template, keeps the whole of CI.

**Consequences.** A pull request costs two short jobs instead of the app
job, and the review happens on every one, not when an agent remembers. The
record is what a laptop said, not a signature: an agent could write one by
hand. Against that: its tree must be the head's, `pnpm verify` takes
minutes to run again on any commit, and the owner can dispatch `ci.yml`. A
review costs Claude tokens, and an agent's verdict is advice, not a
second person: the owner still reads before merging. Without rulesets,
the hook is the gate, and a hook can be skipped (`--no-verify` is a
house rule, not a lock).

**Revisit if.** The plan changes (paid minutes, rulesets) or a self-hosted
Linux runner is set up (`runs-on` it, and its minutes are free): then
`CI_MODE` goes, and `pnpm verify` stays as the run before a push.
