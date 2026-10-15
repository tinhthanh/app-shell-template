# Changelog

Every user-visible change gets a bullet under Unreleased, in plain words
about what the person gets. A release renames the heading to its version.

## Unreleased

- On a phone the sidebar is a bar across the top with the places in a menu, and Settings and the Kit pick their section from a list; printing a page leaves out the sidebar, status bar and buttons; a right-to-left language (`?dir=rtl`) mirrors the whole app, the resize handle included.

- ⌘K finds projects by a few letters; a project's page has a breadcrumb back to the list and names the window after it; What's new shows a version's notes once after an update, and from ⌘K or Settings › About.

- Projects is a table: sort by name, owner or updated from the header (the sort is in the address), move between rows with the arrows, PageUp/Down, Home and End, open one with Enter; thousands of rows stay quick.

- Sign in: the app asks who is signed in, shows a sign-in page while nobody is, sends the session with every call, and signs out on a 401 or from the account menu in the sidebar.
- Dates and numbers read in your language ("12 minutes ago", "14 Oct 2026").
- The sidebar, status bar, tags and settings text grow with the text size (⌘+), and the Match system card wraps on a narrow window instead of hiding its pickers.

- Projects: the search, status and tag filters are in the address, so reload, Back and a shared link keep them; coming back to the list shows it at once; a status change shows before the server answers and goes back if it refuses; a project can be created (from the empty page too) and deleted after a confirm; closing the edit dialog with unsaved changes asks first; Back puts the keyboard on the row you came from; the palette gives the keyboard back to what opened it.

- The app can be published to GitHub Pages or run in a container (docs/deploy.md), and a tag makes a GitHub release with the changelog as its notes.

- One build runs against any API: the host writes `config.js` (docs/deploy.md). Away from a developer's machine, running on the fixtures shows a banner.
- A tab left open across a deploy reloads itself once instead of failing.

- The sidebar marks only the place you are on, and tells a screen reader which it is.
- A focused project row shows a ring; the loader's clock is no longer read aloud; the edit form shows one message per field, in the app's words, and marks the name as required.
- The build works from a sub-folder (relative asset paths), and `?api=`, `?mock=` and `?crash=` only work in development or a build made with `VITE_KNOBS=1`.
- Status bar buttons say what they open; the "mock" chip is a button that opens About.

- The mock takes `?failOnce=1` (the first call fails, then Try again recovers), `?failWrites=1` (saves fail, reads don't) and `?crash=<view>` (the view throws, so the error boundary shows); the Kit's Overlays section has a confirm whose action fails.

- ⌘+ zooms the text: it is ⌘⇧= on most keyboards, which did nothing before.
- The Home page links to the Kit, and its counts come from the code.
