# The repository's rules

`workflows/ci.yml` runs on every pull request: the app job (typecheck, lint,
the checks, unit tests, build, Playwright with axe in both appearances),
the `evidence` job (`scripts/check-evidence.mjs`: a behaviour change comes
with a test, a user-visible one with a changelog bullet, the title is a
conventional subject) and the `guardrails` job
(`scripts/check-guardrails.mjs`: nothing skips a test or edits a check
without the `guardrail-change` label).

`workflows/codeql.yml` is GitHub's code scanning (security and quality
queries) on every pull request, on `main` and weekly; it reports, it does
not block (it is not a required check).

`workflows/pages.yml` publishes `dist/` to GitHub Pages on every push to
`main` (set the repository variable `API_URL`, or `MOCK=1` for a demo on the
fixtures). `workflows/release.yml` turns a tag `vX.Y.Z` into a GitHub release
(`.claude/skills/release`).

`rulesets/main.json` makes `main` take only squash-merged pull requests
with those three checks green, with no force pushes. A code owner's review
isn't required: with one owner, nobody could approve their own PR. Admins
can bypass, but only through a pull request. GitHub applies rulesets to private repositories on paid plans and to
public ones on any plan. `node scripts/setup-repo.mjs` applies it, creates
the label below and sets the CODEOWNERS owner; by hand:

```sh
gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json
```

Create the `guardrail-change` label once: `gh label create guardrail-change --color D93F0B --description "Changes a check, a config or the rules agents follow"`.

Dependabot's pull requests go through the same gates, with two allowances
the scripts make for `dependabot[bot]`: its "Bump" subject (it cannot be
told to write lowercase) and its workflow edits without the label (an
action's version is all it ever changes there). A major TypeScript bump is
ignored until it is migrated by hand.

## A private repository

What GitHub gives each, on its free plan:

| | Public | Private, GitHub Free |
|---|---|---|
| `ci.yml` | free | paid past the plan's minutes; with `CI_MODE=local` only the evidence and guardrails jobs run, seconds each |
| `codeql.yml` | free | needs GitHub Advanced Security: the job stays off unless `CODEQL=on` |
| `rulesets/main.json` | applied | not available: nothing stops a red pull request merging |
| GitHub Pages | free | needs a paid plan |
| Dependabot, releases, CODEOWNERS | free | free |

`node scripts/setup-repo.mjs` sets `CI_MODE=local` on a private repository
(ADR 0017): `pnpm verify` runs the app job on a laptop, with the
`reviewer` agent's verdict, and records it in `evidence/`; the pre-push hook
and the evidence job hold the pushed head to that record
(`scripts/check-proof.mjs`). `gh variable delete CI_MODE` turns the app job
back on. A self-hosted Linux runner is the other way out: its minutes are
free, and `runs-on` names it. Run only your own pull requests on it, since
the code in one runs on that machine.
