import { type BrowserContext, test as base, expect, type Locator, type Page } from "@playwright/test";

// The browser suite's shared setup. Every test opens the production build
// (vite preview) in its own browser context, so storage starts empty unless
// a test seeds it, and fails if the page throws (pageerror) or reaches a
// server (every request off the page's origin is refused).
//
// Mock mode runs the app on its fixtures (?mock=1, src/lib/mock.ts), which
// are fixed: tests wait on what they expect to see, never on time. The
// page is told it is on Linux (?platform=linux), so Ctrl is the modifier
// wherever the suite runs; `mod` is that key, and platform=mac in params
// switches a test to ⌘.
//
// Stable hooks, so tests never click text that moves: data-testid on the
// sidebar (sidebar, sidebar-rail, sidebar-handle, nav-<id>), settings
// (settings-nav-<id>, settings-<id>, theme-option with data-theme-id), the
// palette (command-palette), projects (projects, project-row with
// data-project, projects-loading, -empty, -failed, project-detail), the
// status bar, the zoom HUD and the announcer.

// The modifier key the page expects: Ctrl, unless a test opens with
// params: { platform: "mac" }.
export const mod = (platform = "linux") => (platform === "mac" ? "Meta" : "Control");

export interface OpenOptions {
  // app.prefs as an earlier run saved it (lib/prefs.ts), before the app starts.
  // Seeded prefs count What's new as seen unless whatsNewSeen is given.
  prefs?: Record<string, unknown>;
  // app.ui's theme (lib/store.ts).
  theme?: string;
  // Extra query parameters: slow, fail, empty, platform…
  params?: Record<string, string>;
  // The view to open, as its address without the #: "/projects/p-shop".
  hash?: string;
}

export interface App {
  page: Page;
  context: BrowserContext;
  open(opts?: OpenOptions): Promise<void>;
  // A place in the sidebar, by its id (lib/nav.tsx).
  nav(id: string): Locator;
  openSettings(section: string): Promise<Locator>;
  // What the app has saved, as JSON.
  stored(key: string): Promise<unknown>;
  // Requests that tried to leave the page's origin, and same-origin answers of 400 or more.
  outside: string[];
  // Lets a test expect a console error that is the behaviour under test (the
  // error boundary's own line).
  allowConsoleError(pattern: RegExp): void;
}

export const test = base.extend<{ app: App }>({
  app: async ({ page, context }, use, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`${e.name}: ${e.message}`));
    // A console.error is a bug too (React's warnings, a caught render error).
    const consoleErrors: string[] = [];
    const allowed: RegExp[] = [];
    // How many opens have seeded storage: each later one is a newer generation.
    let seeds = 0;
    page.on("console", (m) => {
      if (m.type() === "error" && !allowed.some((r) => r.test(m.text()))) consoleErrors.push(m.text());
    });
    const outside: string[] = [];
    const origin = new URL(info.project.use.baseURL ?? "http://localhost").origin;
    // A chunk or an asset the page asked for and didn't get.
    page.on("response", (r) => {
      if (r.url().startsWith(origin) && r.status() >= 400) outside.push(`${r.status()} ${r.url()}`);
    });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(origin) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
      outside.push(`${route.request().method()} ${url}`);
      return route.abort();
    });

    const app: App = {
      page,
      context,
      outside,
      allowConsoleError: (p) => void allowed.push(p),
      async open(opts = {}) {
        if (opts.prefs || opts.theme) {
          // Seeded before the app's own scripts, as storage left by an
          // earlier run would be, once per open: a reload keeps what the app
          // saved, and a later open with other prefs seeds those (each open
          // is a newer generation, and only the newest writes).
          seeds += 1;
          await context.addInitScript(
            ({ prefs, theme, gen }) => {
              if (Number(sessionStorage.getItem("e2e.seeded") ?? 0) >= gen) return;
              sessionStorage.setItem("e2e.seeded", String(gen));
              if (prefs) localStorage.setItem("app.prefs", JSON.stringify(prefs));
              if (theme) localStorage.setItem("app.ui", JSON.stringify({ themeId: theme }));
            },
            // Prefs from an earlier run would get the What's new dialog after
            // an update; it stays away unless a test asks for it.
            { prefs: opts.prefs && { whatsNewSeen: "999.0.0", ...opts.prefs }, theme: opts.theme, gen: seeds },
          );
        }
        const q = new URLSearchParams({ mock: "1", platform: "linux", ...opts.params });
        const url = `/?${q}${opts.hash ? `#${opts.hash}` : ""}`;
        // An address that differs only after its # is a fragment change to the
        // browser, which wouldn't load the page: go there, then load it afresh,
        // so the app starts over with what was seeded.
        const same = new URL(page.url(), "http://x").search === `?${q}` && page.url() !== "about:blank";
        await page.goto(url);
        if (same) await page.reload();
        // The shell is up: a sidebar row, Settings' own list (a page of its
        // own, in the sidebar's place), the phone bar, or the sign-in page.
        await expect(page.getByTestId("nav-home").or(page.getByTestId("settings-back")).or(page.getByTestId("phone-bar")).or(page.getByTestId("signin")).first()).toBeVisible();
      },
      nav: (id) => page.getByTestId(`nav-${id}`),
      async openSettings(section) {
        // From Settings itself its list is already there; elsewhere the sidebar opens it.
        if (!(await page.getByTestId("settings-back").isVisible())) await page.getByTestId("nav-settings").click();
        await page.getByTestId(`settings-nav-${section}`).click();
        const body = page.getByTestId(`settings-${section}`);
        await expect(body).toBeVisible();
        return body;
      },
      stored: (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key),
    };

    await use(app);

    if (errors.length) await info.attach("pageerrors", { body: errors.join("\n"), contentType: "text/plain" });
    expect(errors, "the page threw").toEqual([]);
    expect(consoleErrors, "the page logged an error").toEqual([]);
    expect(outside, "a test reached off the page, or a request failed").toEqual([]);
  },
});

export { expect };
