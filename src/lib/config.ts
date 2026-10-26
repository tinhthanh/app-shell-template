// The host's runtime configuration (public/config.js, loaded by index.html
// before the app; docs/deploy.md): one build, any environment. Read here
// and nowhere else, so what a host may set is this one type. Pure: the
// node tests give their own.
export interface RuntimeConfig {
  // The API's base; it wins over the build's VITE_API_URL (lib/api.ts).
  apiUrl?: string;
  // Force the fixtures, for a demo deployment.
  mock?: boolean;
  // Features turned on or off for this deployment, over their defaults (lib/flags.ts).
  flags?: Record<string, boolean>;
  // Where errors the app didn't expect are sent, as JSON (lib/report.ts).
  reportUrl?: string;
  // Where usage events are sent, as JSON, for those who allow it (lib/analytics.ts).
  analyticsUrl?: string;
}

export const runtime = (): RuntimeConfig => (globalThis as { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__ ?? {};
