// Runtime configuration: the host writes this file (or serves another at
// the same path, no-cache) so one build runs against any API. Loaded by
// index.html before the app, read by src/lib/config.ts (RuntimeConfig, the
// one list of what may go here). Leave apiUrl empty to run on the fixtures.
window.__APP_CONFIG__ = {
  apiUrl: "",
  // mock: true,                                   // the fixtures even with an apiUrl, for a demo deployment
  // flags: { gettingStarted: false },             // features on or off for this deployment (src/lib/flags.ts)
  // reportUrl: "https://errors.example.test",     // where errors the app didn't expect are sent, as JSON
  // analyticsUrl: "https://events.example.test",  // where usage events go, for those who allow it
};
