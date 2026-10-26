import { CSPProvider } from "@base-ui/react/csp-provider";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { ErrorBoundary } from "@/components/error-boundary";
import { mayShare, startAnalytics } from "@/lib/analytics";
import { client, knobsOn } from "@/lib/api";
import { APP_COMMIT, APP_VERSION } from "@/lib/app";
import { runtime } from "@/lib/config";
import { flagsFrom, setFlags } from "@/lib/flags";
import { language } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { beaconReporter, benign, both, report, setReporter, viewPath } from "@/lib/report";
import { signedIn, signedOut, useSession } from "@/lib/session";
import { once } from "@/lib/storage";
import { startTabs } from "@/lib/tabs";
import "@/index.css";

// What the host configured (config.js, lib/config.ts): the flags for this
// deployment, where errors go and where usage goes.
const config = runtime();
setFlags(flagsFrom(config, location.search, knobsOn()));
const beacon = (url: string, body: string) => navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
if (config.reportUrl) {
  const toConsole = (error: unknown, context?: Record<string, string>) => console.error(error, context ?? "");
  setReporter(
    both(
      toConsole,
      beaconReporter(config.reportUrl, () => ({ view: viewPath(location.hash), version: APP_VERSION, commit: APP_COMMIT, language: language() }), beacon),
    ),
  );
}
if (config.analyticsUrl)
  startAnalytics(
    config.analyticsUrl,
    () => usePrefs.getState().shareUsage && mayShare(),
    () => ({ version: APP_VERSION, language: language() }),
    beacon,
  );

// The other tabs (lib/tabs.ts): signing out in one signs out every one; a
// sign-in in one has a tab on the sign-in page look again; settings follow.
startTabs(typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel("app"), window, {
  signedOut: () => signedOut({ fromOtherTab: true }),
  signedIn: () => {
    if (useSession.getState().status === "signed-out")
      client.me().then(
        (user) => signedIn(user),
        () => {},
      );
  },
});

// Errors nothing caught still get reported (lib/report.ts).
window.addEventListener("error", (e) => {
  if (!benign(e.message)) report(e.error ?? e.message, { where: "window" });
});
window.addEventListener("unhandledrejection", (e) => report(e.reason, { where: "promise" }));

// A deploy replaces the hashed files: a tab left open then fails its next
// lazy import. Once per visit, reload to pick up the new build instead of
// showing an error. Offline, a reload would only leave a dead page: the
// import fails as it would, and the next visit tries again.
window.addEventListener("vite:preloadError", (e) => {
  if (!navigator.onLine || !once("app.reloaded-after-deploy")) return;
  e.preventDefault();
  location.reload();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* No <style> elements from Base UI (the scrollbar one is in index.css),
        so a strict style-src 'self' holds (docs/deploy.md). */}
    <CSPProvider disableStyleElements>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </CSPProvider>
  </React.StrictMode>,
);
