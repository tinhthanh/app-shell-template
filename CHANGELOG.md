# Changelog

Every user-visible change gets a bullet under Unreleased, in plain words
about what the person gets. A release renames the heading to its version.

## Unreleased

- Several tabs act as one: signing out in one signs out all, signing in brings back the others, and a setting or theme changed in one is the same in the rest.
- A session the server ends warns you two minutes before, with Stay signed in; when it ends, the sign-in page says why. A call that finds the session ended asks once for a longer one before signing you out.
- A deployment can turn features on or off, send unexpected errors to its own collector, and collect usage from people who turn on Settings › General › Share usage data (off by default, and never with Global Privacy Control), all from config.js or the container's REPORT_URL and ANALYTICS_URL.
- Counts read as sentences: "1 project", "5,000 projects", "1 project matches", with numbers written the way the language writes them (5.000 in Vietnamese).

- An address the app doesn't know says "Nothing here" with a way Home, instead of quietly showing Home; a project that is gone says so without a pointless Try again, and one in a workspace you aren't in says it isn't yours to see.
- A change saved on a project's page reaches the lists beside it at once: renamed, re-sorted, counted again, without leaving the page.
- The app starts lighter (200 KB instead of 219 KB): the command palette, the sign-in page and the new-workspace form load once they are needed, or when the app is idle.

- Settings › General describes the sidebar as it is now: folded, the rail of places and workspaces is left.

- After a sign-out, whoever signs in next starts clean: no notices, counts, Recent or workspace left from the last person, and a toast is shown once, not again.
- The sheet's project list stays full while the list beside it is filtered, says so when it can't be read (with Try again), and a change or a delete reaches every list of the projects at once; a deleted project leaves Recent.
- When the workspaces can't be read, Projects says so with Try again instead of loading for ever; a viewer is offered no new workspace, and a new one takes the keyboard.
- The rail's tooltips and menus open on the reading side, so they mirror in a right-to-left page, and a place's count is part of its name for a screen reader.
- Going offline while the app fetches its views in the background no longer reloads into a blank page; it carries on once back online.

- The sidebar is a rail beside a sheet, as Shipyard's is: the rail has the places (the rest under its "…", where you choose which stay on it), your workspaces as tiles (the one on show raised, a dot when something in one waits, a + to make another) and Settings; the sheet shows the workspace, search and the open place's own list, with Projects grouped by status. ⌘\ folds the sheet away and leaves the rail.
- Projects belong to a workspace: picking another on the rail lists its projects, and a project opened from a link brings its workspace with it. The list-only sidebar is gone.

- The sidebar has a bell: what happened while you were elsewhere (a status change, an export) shows as a toast and stays there, unread until you look, with a way back to it.
- A place in the sidebar shows its count (Projects 8), and the records you opened last sit under Recent, which folds away and remembers it.
- Offline, the status bar says so; back online the word goes. Views can put their own facts there.
- Home starts with a short getting-started list that ticks each step as you do it, and goes for good once you put it away.

- Typing in a list's search asks the server once you pause, not once a letter, and a search or a filter you've moved on from stops its request; a read the network dropped or a busy server turned away is tried twice more by itself before it says so.

- Another filter shows the loader until its rows come, never the last filter's rows; a reload that fails keeps the rows under a note that says so, with Try again.
- Two quick changes to one record keep the second; a refused change puts a list's row back even when the record was never opened.
- While a form or a confirm is open, a place's shortcut, ⌘, and ⌘\ do nothing, so what was typed stays.
- ⌘K finds a record by what the server matched (its description, an owner), not only by its name.
- Signing out signs this browser out even when the server doesn't answer.
- A table keeps its Tab stop after a long scroll; Esc in an empty Find a setting leaves Settings; a date the server got wrong reads as nothing instead of breaking the page.
- The container (deploy/) puts the API's origin in its CSP, so a docker run with API_URL can reach it, and refuses an API_URL that isn't a plain URL; ?api= can no longer be bent to another host.

- In Vietnamese, the words are written one way (xóa, hủy, tùy chọn) and a status change reads "Shop hiện đang tạm dừng".

- Settings is a page of its own: its list takes the sidebar's place, Back to app or Esc returns to where you were (filters and all), each section has a large title, rows sit on the page split by hairlines, and Find a setting takes you to the section that has what you type. Appearance starts with Light, Dark or Match system.
- The sidebar's strip and every page's header are one height, and pages share one gutter.

- The sidebar and Settings' list are written in one quiet ink: places a step softer than the text, icons softer still, and the one you are on in full; every theme stays readable.

- A screen reader names the account button, the version and the mock chip by the words they show (the account button is your name; the version reads "v0.1.0"), as WCAG's "label in name" asks.

- Text comes in a dozen sizes by what it is (a title, a row, a note, a tag), the same on every page; a project's description reads at the body size.

- The app speaks Vietnamese: Settings › General › Language picks English, Tiếng Việt, or Match system (the default, which follows your computer); dates and numbers follow the language.

- What you can do follows your role: a viewer sees the projects but no New, Edit, status change or Delete; a member does everything but delete; the account menu says which role you have.

- Closing a form after changing only a choice (a select) asks before it throws the change away, as it does after typing; the Kit has a form dialog with a select to copy; a loader's clock is as readable as its words.

- Projects are read from the server a page at a time, filtered and sorted there: the next page comes as you reach the end of the list (with Try again if it doesn't), the count says how many match a filter, and Back from a row far down a long list puts the keyboard on it again.

- In a development or demo build, `?api=` takes only this site or a server on this machine: a link can no longer send the app's requests to another server.

- A repository made from the template sets itself up with one command (`node scripts/setup-repo.mjs`), and its Pages run is skipped, not failed, until it is configured.

- The app starts without the fixtures' code when it talks to an API; searching from the palette shows some of every kind of record.

- The shortcuts search is a search box like the others, so Esc clears it.

- On a phone the projects table leaves out the Updated column, so a row fits the width; a refusal from the server lands on the field it names in a form.

- Off a Mac, a key on its own reads as a word (Enter, Tab, Backspace), as it does beside Ctrl; the theme previews draw their status lights and prompt instead of typing them, so they look the same on every machine.

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
