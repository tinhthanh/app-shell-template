// report sends an error the app didn't expect to wherever errors go: the
// console, and config.js's reportUrl when the host gives one (main.tsx sets
// beaconReporter), or a client of your own such as Sentry's. Never put a
// token or a URL's query string in the context.
//
//   setReporter((error, context) => Sentry.captureException(error, { extra: context }));

export type Reporter = (error: unknown, context?: Record<string, string>) => void;

let reporter: Reporter = (error, context) => console.error(error, context ?? "");

export function setReporter(r: Reporter) {
  reporter = r;
}

export function report(error: unknown, context?: Record<string, string>) {
  try {
    reporter(error, context);
  } catch {
    // A reporter that throws must not take the app with it.
  }
}

// What an error report carries: the error's words and stack, where in the
// app, which build and language. The address is the view's path without its
// query (a search, a filter or a token stays on the device).
export interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, string>;
  view: string;
  version: string;
  commit: string;
  language: string;
}

// The most a page sends: a loop that throws on every frame would otherwise
// send thousands. The same message twice is sent once.
export const MAX_REPORTS = 10;

// beaconReporter sends each error once, as JSON, to url, through send
// (navigator.sendBeacon in the app: it survives the page closing and needs
// no answer). about says what build and view the page is on.
export function beaconReporter(url: string, about: () => Omit<ErrorReport, "message" | "stack" | "context">, send: (url: string, body: string) => boolean): Reporter {
  const seen = new Set<string>();
  return (error, context) => {
    const message = error instanceof Error ? error.message : String(error);
    if (seen.has(message) || seen.size >= MAX_REPORTS) return;
    seen.add(message);
    const body: ErrorReport = { message, stack: error instanceof Error ? error.stack : undefined, context, ...about() };
    send(url, JSON.stringify(body));
  };
}

// both sends to each of two reporters (the console and the beacon).
export const both =
  (a: Reporter, b: Reporter): Reporter =>
  (error, context) => {
    a(error, context);
    b(error, context);
  };

// viewPath is the address without what comes after "?": #/projects?q=acme is #/projects.
export const viewPath = (hash: string): string => hash.split("?")[0] || "#/";
