// report sends an error the app didn't expect to wherever errors go: the
// console until main.tsx (or your app) sets a reporter, such as a Sentry
// client. Never put a token or a URL's query string in the context.
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
