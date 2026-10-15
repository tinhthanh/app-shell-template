# Changelog

Every user-visible change gets a bullet under Unreleased, in plain words
about what the person gets. A release renames the heading to its version.

## Unreleased

- One build runs against any API: the host writes `config.js` (docs/deploy.md). Away from a developer's machine, running on the fixtures shows a banner.
- A tab left open across a deploy reloads itself once instead of failing.

- The sidebar marks only the place you are on, and tells a screen reader which it is.
- A focused project row shows a ring; the loader's clock is no longer read aloud; the edit form shows one message per field, in the app's words, and marks the name as required.
- The build works from a sub-folder (relative asset paths), and `?api=`, `?mock=` and `?crash=` only work in development or a build made with `VITE_KNOBS=1`.
- Status bar buttons say what they open; the "mock" chip is a button that opens About.

- The mock takes `?failOnce=1` (the first call fails, then Try again recovers), `?failWrites=1` (saves fail, reads don't) and `?crash=<view>` (the view throws, so the error boundary shows); the Kit's Overlays section has a confirm whose action fails.

- ⌘+ zooms the text: it is ⌘⇧= on most keyboards, which did nothing before.
- The Home page links to the Kit, and its counts come from the code.
