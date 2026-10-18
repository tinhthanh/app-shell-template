# Decisions

Why things are the way they are, one file each, so nobody re-decides them
by accident. Before changing one of these, read its record; if the reasons
no longer hold, write a new record that supersedes it.

| # | Decision |
|---|---|
| [0001](0001-hash-routing.md) | Views live at hash addresses, not paths |
| [0002](0002-mock-by-default.md) | The app runs on fixtures unless an API is named |
| [0003](0003-node-tests-without-a-bundler.md) | Unit tests run in node with strip-types, no bundler |
| [0004](0004-system-theme-first.md) | The first launch follows the system, and no flash on the next |
| [0005](0005-coss-ui-on-base-ui.md) | The UI kit is coss ui on Base UI, vendored and edited in place |
| [0006](0006-destructive-strong.md) | A derived fill for destructive buttons |
| [0007](0007-tips-not-titles.md) | Tooltips are `<Tip>`, never `title=` |
| [0008](0008-biome-wide-lines.md) | Biome, at a line width of 200 |
| [0009](0009-where-state-lives.md) | Store, prefs and resources are three different homes |
| [0010](0010-the-e2e-contract.md) | The browser suite's contract |
| [0011](0011-sessions.md) | Sessions are a cookie by default, and never in storage |
| [0012](0012-permissions.md) | What a person may do is one table, asked by name |
| [0013](0013-words.md) | The app's words are one table per language, with no library |

Format: Status, Context, Decision, Consequences, Revisit if. Under 40 lines.
