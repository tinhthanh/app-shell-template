---
name: release
description: Cut a release of this app (version bump, changelog, tag, GitHub release). Use when asked to release, tag or publish a version.
---

# Release

The version in `package.json` is what Settings › About shows; the
changelog's Unreleased section is what the release notes become.

1. Add the version's notes to `src/lib/releases.ts` (a few lines, in the
   changelog's words): the What's new dialog shows them once after the
   update, and the palette and Settings › About open them.
2. `node scripts/release.mjs X.Y.Z` on a branch: it sets the version and
   turns `## Unreleased` into `## X.Y.Z (date)`, leaving a fresh Unreleased
   above. It refuses an empty Unreleased.
3. Commit as `chore: release X.Y.Z`, open the PR, let CI pass, merge.
4. Tag the merge commit on main: `git tag vX.Y.Z && git push origin vX.Y.Z`.
   `.github/workflows/release.yml` checks the tag matches package.json,
   runs `pnpm check`, builds with hidden source maps, and creates the GitHub
   release with `dist` as a tarball and the changelog section as notes.
5. Check the release page, and that About shows the version on the deployed
   site (the Pages workflow publishes `main`).
