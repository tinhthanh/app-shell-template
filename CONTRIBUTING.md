# Contributing

For people. Agents read [AGENTS.md](AGENTS.md), and so should you: it is
the contract CI holds every pull request to, and this page only says how
to get set up and what to expect.

## Set up

Node 22.12 or later and pnpm (`corepack enable` gives you the version in
`package.json`). Then:

```sh
pnpm install --frozen-lockfile   # also points git at .githooks/: format on commit, checks on push
pnpm dev                      # http://localhost:1420/?mock=1 on the fixtures
pnpm exec playwright install chromium
```

Docker is needed only for `pnpm test:visual` on a Mac or Windows machine
(the screenshot baselines are Linux renderings).

## Before you open a pull request

```sh
pnpm check                               # typecheck, lint, the rule checks (check:*), themes, unit tests, build, size budget
E2E_PORT=1427 pnpm test:e2e e2e/x.spec.ts    # the specs for what you touched
pnpm test:visual                         # when the look changed (then --update, and commit the baselines)
```

Work on a branch. The pull request template asks for the proof: which
tests cover the change, the last lines of the checks, screenshots for a
UI change, and for a feature, what the task left open and you decided.
The `evidence` and `guardrails` jobs refuse a PR that lacks them; the
rules are in `AGENTS.md › Done means`, and the scripts in `scripts/`.

Titles are lowercase conventional subjects that say what the user gets:
`feat: a project can be archived`, `fix: the palette keeps its place`.
User-visible changes get a bullet under `## Unreleased` in `CHANGELOG.md`.

## Where things are

`docs/architecture.md` is the map; `docs/decisions/` says why things are
the way they are; `.claude/skills/` holds the recipes (add a view, a
resource, a form, a theme, a browser test, a release).

## Reporting a problem

Open an issue with what you did, what you expected, what happened, and
the address (the `#/…` part and any `?` knobs) where it happened. A
screenshot in both appearances helps.
