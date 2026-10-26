import { CSPProvider } from "@base-ui/react/csp-provider";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { ErrorBoundary } from "@/components/error-boundary";
import { client } from "@/lib/api";
import { report } from "@/lib/report";
import { signedIn, signedOut, useSession } from "@/lib/session";
import { once } from "@/lib/storage";
import { startTabs } from "@/lib/tabs";
import "@/index.css";

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
window.addEventListener("error", (e) => report(e.error ?? e.message, { where: "window" }));
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
