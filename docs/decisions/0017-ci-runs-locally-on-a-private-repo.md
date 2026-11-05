# 0017: Where Actions minutes cost, CI runs on a laptop, reviewed, and says so

**Status:** accepted, 2026-11-05

**Context.** A repository made from this template is often private, and on
GitHub Free a private repository pays for Actions past a small allowance,
gets no rulesets (nothing stops a red pull request merging) and no CodeQL.
The app job is most of the minutes: the build and the browser suite with
axe. rang-sang, made from this template, turned CI off for this (its ADR
0023), but runs no review, and its pre-push hook only warns.

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
when `CI_MODE` is `local` (on each branch pushed; a tag is a release of
`main`), and so does the evidence job on the pull request's head. The
evidence and guardrails jobs still run, seconds each, and the app job still
runs when dispatched and on Dependabot's pull requests, which no laptop
verifies.
A public repository, this template, keeps the whole of CI.

**Consequences.** A pull request costs two short jobs instead of the app
job, and every one is reviewed. The record is what a laptop said, not a
signature (an agent could write one): its tree must be the head's, and the
owner can dispatch `ci.yml` on any commit. A review costs Claude tokens;
its verdict is advice, and the owner still reads before merging. Without rulesets the hook is the gate, and a hook can be
skipped (`--no-verify` is a house rule, not a lock). What `main` gets
from a squash merge is a tree nobody ran, and two open pull requests each
commit `evidence/`: the second rebases, and verifies again.

**Revisit if.** The plan changes (paid minutes, rulesets) or a self-hosted
Linux runner is set up (`runs-on` it, and its minutes are free): then
`CI_MODE` goes, and `pnpm verify` stays as the run before a push.
