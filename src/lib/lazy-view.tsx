import { type ComponentType, lazy, useState } from "react";

// lazyView is a view (Projects, Kit, Settings…) or a dialog's content that
// loads after the app has started rather than with it, so they don't all
// weigh on its start.
// preloadViews fetches them once the app is up and idle, and a view whose
// code is in by the time it shows draws at once, without suspending (no
// blank frame on a first visit). Render it under a <Suspense>.
const loaders: (() => Promise<unknown>)[] = [];

// What a lazy view keeps: its code once loaded, and the lazy that loads it
// (made afresh after a failure, so the next visit really tries again).
interface Entry<P> {
  loaded?: ComponentType<P>;
  lazy: ComponentType<P>;
}

// Shown draws a lazy view: the loaded code at once when it is in, else the
// lazy under the caller's Suspense. Chosen once per mount: switching from the
// lazy to the loaded code under a mounted view would remount it. At module
// level, so React sees one component however many views there are.
function Shown<P extends object>({ entry, props }: { entry: Entry<P>; props: P }) {
  const [Ready] = useState(() => entry.loaded);
  const Lazy = entry.lazy;
  return Ready ? <Ready {...props} /> : <Lazy {...props} />;
}

export function lazyView<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let pending: Promise<ComponentType<P>> | undefined;
  const entry = {} as Entry<P>;
  const get = () =>
    (pending ??= load().then(
      (c) => (entry.loaded = c),
      (err) => {
        // A failed fetch can be tried again on the next visit.
        pending = undefined;
        throw err;
      },
    ));
  loaders.push(get);
  // React keeps a lazy's failure for good, so a failed one is made afresh.
  const make = (): ComponentType<P> =>
    lazy(() =>
      get().then(
        (c) => ({ default: c }),
        (err) => {
          entry.lazy = make();
          throw err;
        },
      ),
    );
  entry.lazy = make();
  return (props: P) => <Shown entry={entry} props={props} />;
}

// preloadViews loads every lazy view's code a while after the app starts,
// one at a time when the main thread is free. Safari has no
// requestIdleCallback; there it is a timer. Offline it waits to be back
// online, and a load the network dropped is tried again then.
export function preloadViews(): () => void {
  const ric = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
  const idle = (cb: () => void) => (ric ? ric(cb, { timeout: 2000 }) : window.setTimeout(cb, 50));
  const cancel = (h: number) => (ric ? window.cancelIdleCallback(h) : window.clearTimeout(h));
  let i = 0;
  let handle = 0;
  let stopped = false;
  const next = () => {
    if (stopped) return;
    if (!navigator.onLine) {
      window.addEventListener("online", () => (handle = idle(next)), { once: true });
      return;
    }
    const load = loaders[i];
    // All in: said on the page, for whatever waits on a settled app (a browser test going offline).
    if (!load) {
      document.documentElement.dataset.viewsLoaded = "";
      return;
    }
    void load()
      .then(
        () => i++,
        // Dropped by the network: the same one again once back; anything else, the next.
        () => navigator.onLine && i++,
      )
      .finally(() => {
        if (!stopped) handle = idle(next);
      });
  };
  // After the first screen has settled.
  const start = window.setTimeout(() => (handle = idle(next)), 1500);
  return () => {
    stopped = true;
    window.clearTimeout(start);
    cancel(handle);
  };
}
