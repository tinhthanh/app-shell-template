import { type BrowserContext, expect, type Locator, type Page, test as base } from "@playwright/test";

// The browser suite's shared setup. Every test opens the production build
// (vite preview) in its own browser context, so storage starts empty unless
// a test seeds it, and fails if the page throws (pageerror) or reaches a
// server (every request off the page's origin is refused).
//
// Mock mode runs the app on its fixtures (?mock=1, src/lib/mock.ts), which
// are fixed: tests wait on what they expect to see, never on time.
//
// Stable hooks, so tests never click text that moves: data-testid on the
// sidebar (sidebar, sidebar-rail, sidebar-handle, nav-<id>), settings
// (settings-nav-<id>, settings-<id>, theme-option with data-theme-id), the
// palette (command-palette), projects (projects, project-row with
// data-project, projects-loading, -empty, -failed, project-detail), the
// status bar, the zoom HUD and the announcer.

export interface OpenOptions {
  // app.prefs as an earlier run saved it (lib/prefs.ts), before the app starts.
  prefs?: Record<string, unknown>;
  // app.ui's theme (lib/store.ts).
  theme?: string;
  // Extra query parameters: slow, fail, empty, platform…
  params?: Record<string, string>;
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
  // Requests that tried to leave the page's origin.
  outside: string[];
}

export const test = base.extend<{ app: App }>({
  app: async ({ page, context }, use, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`${e.name}: ${e.message}`));
    const outside: string[] = [];
    const origin = new URL(info.project.use.baseURL ?? "http://localhost").origin;
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
      async open(opts = {}) {
        if (opts.prefs || opts.theme) {
          // Seeded once, before the app's own scripts, as storage left by
          // an earlier run would be; a reload keeps what the app saved.
          await context.addInitScript(
            ({ prefs, theme }) => {
              if (sessionStorage.getItem("e2e.seeded")) return;
              sessionStorage.setItem("e2e.seeded", "1");
              if (prefs) localStorage.setItem("app.prefs", JSON.stringify(prefs));
              if (theme) localStorage.setItem("app.ui", JSON.stringify({ themeId: theme }));
            },
            { prefs: opts.prefs, theme: opts.theme },
          );
        }
        const q = new URLSearchParams({ mock: "1", ...opts.params });
        await page.goto(`/?${q}`);
        await expect(page.getByTestId("nav-home")).toBeVisible();
      },
      nav: (id) => page.getByTestId(`nav-${id}`),
      async openSettings(section) {
        await page.getByTestId("nav-settings").click();
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
    expect(outside, "a test reached off the page").toEqual([]);
  },
});

export { expect };
