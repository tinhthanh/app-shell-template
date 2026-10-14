// The app's name, as people read it. Identifiers (storage keys, CSS
// variables) stay as they are when this changes.
export const APP_NAME = "App Shell";

// The version and commit the build was made from (vite.config.ts); the
// browser tests import this file in node, where neither is defined.
export const APP_VERSION = typeof __APP_VERSION__ === "undefined" ? "0.0.0" : __APP_VERSION__;
export const APP_COMMIT = typeof __APP_COMMIT__ === "undefined" ? "" : __APP_COMMIT__;
