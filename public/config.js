// Runtime configuration: the host writes this file (or serves another at
// the same path, no-cache) so one build runs against any API. Loaded by
// index.html before the app, read by src/lib/api.ts. Leave apiUrl empty
// to run on the fixtures.
window.__APP_CONFIG__ = {
  apiUrl: "",
};
