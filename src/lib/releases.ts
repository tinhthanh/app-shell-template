import type { Release } from "./whats-new.ts";

// What each version brought, for the What's new dialog: a few lines in
// plain words, the way CHANGELOG.md says them. A release (the release
// skill) adds its entry here; the newest shows once after an update.
export const RELEASES: Release[] = [
  {
    version: "0.1.0",
    notes: [
      "A sidebar that folds to a rail, a command palette (⌘K), settings with 23 themes, and a Kit page that shows every component.",
      "Projects as a worked example: a table that sorts and takes the keyboard, filters in the address, a form that edits and creates.",
      "Sign in, and errors in plain words with the details behind a button.",
    ],
  },
];
