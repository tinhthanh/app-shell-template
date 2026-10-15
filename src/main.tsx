import { CSPProvider } from "@base-ui/react/csp-provider";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { ErrorBoundary } from "@/components/error-boundary";
import { report } from "@/lib/report";
import { once } from "@/lib/storage";
import "@/index.css";

// Errors nothing caught still get reported (lib/report.ts).
window.addEventListener("error", (e) => report(e.error ?? e.message, { where: "window" }));
window.addEventListener("unhandledrejection", (e) => report(e.reason, { where: "promise" }));

// A deploy replaces the hashed files: a tab left open then fails its next
// lazy import. Once per visit, reload to pick up the new build instead of
// showing an error.
window.addEventListener("vite:preloadError", (e) => {
  if (!once("app.reloaded-after-deploy")) return;
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
