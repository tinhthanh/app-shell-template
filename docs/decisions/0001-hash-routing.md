# 0001: Views live at hash addresses, not paths

**Status:** accepted, 2026-10-14

**Context.** Reload, the back button and links to a view need the URL to
name the view. The app is one static page with no server of its own;
`vite preview`, GitHub Pages, S3 and the browser suite all serve it
without a rewrite rule.

**Decision.** `routes.ts` maps a `View` to a hash (`#/projects/p-shop`,
`#/settings/appearance`) and back. `store.ts` keeps the hash and the view
in step: a view change pushes the hash, popstate reads it. `View` stays
the source of truth; the hash only mirrors it.

**Consequences.** URLs carry a `#`. There is no server-side routing and
no use of `#` for in-page anchors. Assets are referenced relatively
(`base: "./"` in `vite.config.ts`), so the same build serves from the root
or a sub-folder; `BASE_PATH` sets an absolute base for a host that needs one. Adding a view means a case in both
directions (`scripts/check-views.mjs` checks the one TypeScript can't).

**Revisit if.** The app gains a server that can rewrite paths, or needs
per-view server rendering.
