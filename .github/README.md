# The repository's rules

`workflows/ci.yml` runs on every pull request: the app job (typecheck, lint,
the checks, unit tests, build, Playwright with axe in both appearances),
the `evidence` job (`scripts/check-evidence.mjs`: a behaviour change comes
with a test, a user-visible one with a changelog bullet, the title is a
conventional subject) and the `guardrails` job
(`scripts/check-guardrails.mjs`: nothing skips a test or edits a check
without the `guardrail-change` label).

`rulesets/main.json` makes `main` take only squash-merged pull requests
with those three checks green and a code owner's review, with no force
pushes. GitHub applies rulesets to private repositories on paid plans and to
public ones on any plan; apply it once with:

```sh
gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json
```

Create the `guardrail-change` label once: `gh label create guardrail-change --color D93F0B --description "Changes a check, a config or the rules agents follow"`.
