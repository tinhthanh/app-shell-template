# 0004: The first launch follows the system, and no flash on the next

**Status:** accepted, 2026-10-14

**Context.** A web app that opens dark on a light desktop looks broken;
one that paints dark and then switches to the saved light theme flashes.

**Decision.** `themeId` defaults to `"system"`: `prefers-color-scheme`
picks between `prefs.systemThemes.light` and `.dark`. `applyTheme` keeps
the last appearance in `app.appearance`, and an inline script in
`index.html` reads it (or the media query) and sets `.dark` and
`color-scheme` before the first paint. Themes are inline CSS variables on
`<html>`, so no component imports theme code; `check:themes` holds every
built-in theme to WCAG contrast.

**Consequences.** The first paint can only be dark or light, not the
exact theme; the stylesheet's own dark and light tokens are close enough
that nothing visibly jumps. A theme that fails contrast can't ship.

**Revisit if.** The app needs a theme chosen per account from a server.
