import type { Page } from "@playwright/test";

import { APP_NAME } from "../src/lib/app";
import { expect, mod, test } from "./fixtures";

// The shell: the sidebar's places, the palette, the shortcuts and what the
// app remembers between launches. The page is on Linux unless a test says
// mac, so the modifier is Ctrl (fixtures.ts).

test("the sidebar's places open their views, and ⌘1–9 jump to them", async ({ app }) => {
  await app.open();
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
  // One place is current, and only one, in the sidebar and in the rail.
  await expect(app.page.locator("[data-testid=sidebar] [aria-current=page]")).toHaveCount(1);
  await expect(app.nav("projects")).toHaveAttribute("aria-current", "page");
  await expect(app.page.locator("[data-testid=sidebar] [data-active=true]")).toHaveCount(1);
  await expect(app.page).toHaveTitle(`Projects — ${APP_NAME}`);
  // ⌘1–9 follow the sidebar's order, whatever it is.
  const ids = await app.page.locator("[data-testid=sidebar] [data-testid^=nav-]").evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")!.slice(4)));
  const n = (id: string) => ids.indexOf(id) + 1;
  await app.page.keyboard.press(`${mod()}+${n("home")}`);
  await expect(app.page.getByRole("heading", { name: "Home" })).toBeVisible();
  await app.page.keyboard.press(`${mod()}+${n("kit")}`);
  await expect(app.page.getByTestId("kit")).toBeVisible();
  await app.page.keyboard.press(`${mod()}+${n("settings")}`);
  await expect(app.page.getByTestId("settings-general")).toBeVisible();
});

test("the palette opens with ⌘K, finds a place and goes there", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod()}+k`);
  const palette = app.page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await palette.getByRole("combobox").fill("proj");
  await palette.getByRole("option", { name: /Projects/ }).click();
  await expect(palette).toHaveCount(0);
  await expect(app.page.getByTestId("projects")).toBeVisible();
});

test("highlighting a theme in the palette previews it, and Esc puts the old one back", async ({ app }) => {
  await app.open({ theme: "default-dark" });
  const html = app.page.locator("html");
  await app.page.keyboard.press(`${mod()}+k`);
  const palette = app.page.getByTestId("command-palette");
  await palette.getByRole("combobox").fill("paper");
  await palette.getByRole("option", { name: /Paper/ }).hover();
  await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
  await app.page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
  await expect.poll(() => app.stored("app.ui")).toEqual({ themeId: "default-dark" });
});

test("⌘\\ folds the sidebar to a rail, which is remembered", async ({ app }) => {
  await app.open();
  await expect(app.page.getByTestId("sidebar")).toBeVisible();
  await app.page.keyboard.press(`${mod()}+\\`);
  await expect(app.page.getByTestId("sidebar-rail")).toBeVisible();
  await expect.poll(async () => ((await app.stored("app.prefs")) as { sidebarCollapsed?: boolean }).sidebarCollapsed).toBe(true);
  await app.page.reload();
  await expect(app.page.getByTestId("sidebar-rail")).toBeVisible();
  // The rail's places still work.
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
});

test("the keyboard shortcuts sheet lists every shortcut", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod()}+/`);
  const sheet = app.page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Search and commands")).toBeVisible();
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toHaveCount(0);
});

const width = async (page: Page) => Math.round((await page.getByTestId("sidebar").boundingBox())!.width);

test("the sidebar's edge drags it wider, and double-click puts the default back", async ({ app }) => {
  await app.open();
  const page = app.page;
  const handle = page.getByRole("separator", { name: "Resize the sidebar" });
  await expect(handle).toHaveAttribute("aria-valuenow", "240");
  await expect.poll(() => width(page)).toBe(240);
  const b = (await handle.boundingBox())!;
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 8 });
  await expect(page.locator("html")).toHaveClass(/app-resizing/);
  await page.mouse.up();
  await expect(page.locator("html")).not.toHaveClass(/app-resizing/);
  await expect.poll(() => width(page)).toBe(340);
  await expect.poll(async () => ((await app.stored("app.prefs")) as { sidebarWidth?: number }).sidebarWidth).toBe(340);
  await handle.dblclick();
  await expect.poll(() => width(page)).toBe(240);
});

test("the view is in the URL: reload keeps it, the back button goes back, a link opens it", async ({ app }) => {
  await app.open();
  await app.nav("projects").click();
  await expect(app.page).toHaveURL(/#\/projects$/);
  await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
  await expect(app.page).toHaveURL(/#\/projects\/p-shop$/);
  await app.page.reload();
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await app.page.goBack();
  await expect(app.page.getByTestId("projects")).toBeVisible();
  await expect(app.page.getByTestId("project-detail")).toHaveCount(0);
  await app.page.goto("/?mock=1#/settings/appearance");
  await expect(app.page.getByTestId("settings-appearance")).toBeVisible();
  await app.page.goto("/?mock=1#/nowhere");
  await expect(app.page.getByRole("heading", { name: "Home" })).toBeVisible();
});

test("the first launch follows the system's appearance, with no flash on the next", async ({ app }) => {
  await app.open();
  // Playwright's colorScheme is dark (playwright.config.ts).
  await expect(app.page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
  await expect.poll(() => app.stored("app.ui")).toBeNull();
  await app.page.emulateMedia({ colorScheme: "light" });
  await expect(app.page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);
  // The appearance is kept for index.html's first paint.
  await expect.poll(() => app.stored("app.appearance")).toBe("light");
});

test("⌘+ and ⌘− zoom the text and show the HUD; ⌘0 resets", async ({ app }) => {
  await app.open();
  // ⌘+ is ⌘⇧= on a US keyboard.
  await app.page.keyboard.press(`${mod()}+Shift+Equal`);
  const hud = app.page.getByTestId("zoom-hud");
  await expect(hud).toContainText("14px");
  await expect.poll(() => app.page.evaluate(() => document.documentElement.style.fontSize)).not.toBe("");
  await app.page.keyboard.press(`${mod()}+Equal`);
  await expect(hud).toContainText("15px");
  await app.page.keyboard.press(`${mod()}+Minus`);
  await expect(hud).toContainText("14px");
  await app.page.keyboard.press(`${mod()}+0`);
  await expect(hud).toContainText("13px");
  await expect.poll(() => app.page.evaluate(() => document.documentElement.style.fontSize)).toBe("");
});

test("a narrow window folds the sidebar to a rail that still works", async ({ app }) => {
  await app.page.setViewportSize({ width: 700, height: 800 });
  await app.open();
  await expect(app.page.getByTestId("sidebar-rail")).toHaveAttribute("data-fixed", "true");
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
  await app.page.setViewportSize({ width: 1200, height: 800 });
  await expect(app.page.getByTestId("sidebar")).toBeVisible();
});

test("on Linux the keys read Ctrl; on a Mac they read ⌘, and ⌘K opens the palette", async ({ app }) => {
  await app.open();
  await expect(app.page.getByTestId("sidebar").getByText("Ctrl+K")).toBeVisible();
  await app.open({ params: { platform: "mac" } });
  await expect(app.page.getByTestId("sidebar").getByText("⌘K")).toBeVisible();
  await app.page.keyboard.press(`${mod("mac")}+k`);
  await expect(app.page.getByTestId("command-palette")).toBeVisible();
});

test("a view that throws is caught by its boundary; the rest of the app and the way home still work", async ({ app }) => {
  // The boundary logs the error it caught; that line is the behaviour here.
  app.allowConsoleError(/Crashed on purpose/);
  await app.open({ params: { crash: "projects" } });
  await app.nav("projects").click();
  await expect(app.page.getByText("Something in Projects broke")).toBeVisible();
  await app.page.getByRole("button", { name: "Show details" }).click();
  await expect(app.page.locator("pre", { hasText: "Crashed on purpose" })).toBeVisible();
  // The sidebar still works around it.
  await app.nav("kit").click();
  await expect(app.page.getByTestId("kit")).toBeVisible();
  await app.nav("projects").click();
  await app.page.getByRole("button", { name: "Back home" }).click();
  await expect(app.page.getByRole("heading", { name: "Home" })).toBeVisible();
});

test("a confirm whose action fails stays open with the reason, and can be cancelled", async ({ app }) => {
  await app.open({ hash: "/kit/overlays" });
  await app.page.getByRole("button", { name: "Confirm that fails" }).click();
  const confirm = app.page.getByTestId("confirm");
  // Not destructive: the keyboard starts on the action.
  await expect(confirm.getByRole("button", { name: "Archive" })).toBeFocused();
  await app.page.keyboard.press("Enter");
  await expect(confirm.getByRole("alert")).toContainText("Reload to see the latest");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toHaveCount(0);
});

test("⌘\\ tells a screen reader what it did", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod()}+\\`);
  await expect(app.page.getByTestId("announce-polite")).toHaveText("Sidebar folded to a rail");
  await app.page.keyboard.press(`${mod()}+\\`);
  await expect(app.page.getByTestId("announce-polite")).toHaveText("Sidebar shown");
});

test("the saved theme that no longer exists, and prefs that can't be read, fall back to the defaults", async ({ app }) => {
  await app.open({ theme: "gone-theme" });
  await expect(app.page.getByTestId("status-bar")).toContainText("Default Dark");
  await app.page.evaluate(() => localStorage.setItem("app.prefs", "{not json"));
  await app.page.reload();
  await expect(app.page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect(app.page.getByTestId("sidebar")).toBeVisible();
});

test("the appearance kept from last time is set before the first paint", async ({ app }) => {
  // A dark system, but the last theme was light: the page starts light.
  await app.context.addInitScript(() => {
    if (!sessionStorage.getItem("seeded-appearance")) {
      sessionStorage.setItem("seeded-appearance", "1");
      localStorage.setItem("app.appearance", JSON.stringify("light"));
    }
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __firstPaintDark?: boolean }).__firstPaintDark = document.documentElement.classList.contains("dark");
    });
  });
  await app.open();
  await expect.poll(() => app.page.evaluate(() => (window as unknown as { __firstPaintDark?: boolean }).__firstPaintDark)).toBe(false);
});

test("the palette closed gives the keyboard back to what opened it", async ({ app }) => {
  await app.open();
  const search = app.page.getByTestId("sidebar").getByRole("button", { name: "Search" });
  await search.click();
  await expect(app.page.getByTestId("command-palette")).toBeVisible();
  await app.page.keyboard.press("Escape");
  await expect(app.page.getByTestId("command-palette")).toHaveCount(0);
  await expect(search).toBeFocused();
});

test("signed out, the sign-in page covers the app; signing in returns to the address asked for; the account menu signs out", async ({ app }) => {
  await app.page.goto("/?mock=1&platform=linux&signedOut=1#/projects?status=paused");
  const signin = app.page.getByTestId("signin");
  await expect(signin).toBeVisible();
  await signin.getByRole("textbox", { name: "Email" }).fill("sam@acme.test");
  await signin.getByRole("button", { name: "Sign in" }).click();
  await expect(signin.getByText("A password, please.")).toBeVisible();
  await signin.getByLabel("Password").fill("hunter2");
  await signin.getByRole("button", { name: "Sign in" }).click();
  await expect(signin).toHaveCount(0);
  // Where the address pointed, filters included.
  await expect(app.page.getByTestId("project-row")).toHaveCount(1);
  await expect(app.page).toHaveURL(/#\/projects\?status=paused$/);
  await app.page.getByTestId("account").click();
  await app.page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(app.page.getByTestId("signin")).toBeVisible();
});

test("⌘K finds a project by a few letters and opens it", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod()}+k`);
  const palette = app.page.getByTestId("command-palette");
  await palette.getByRole("combobox").fill("ware");
  await palette.getByRole("option", { name: /Warehouse/ }).click();
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Warehouse", exact: true })).toBeVisible();
  await expect(app.page).toHaveTitle(`Warehouse — Projects — ${APP_NAME}`);
  // The breadcrumb goes back to the list.
  await app.page.getByRole("navigation", { name: "breadcrumb" }).getByRole("button", { name: "Projects" }).click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
  await expect(app.page).toHaveTitle(`Projects — ${APP_NAME}`);
});

test("What's new shows once after an update, is kept as seen, and opens again from the palette", async ({ app }) => {
  await app.open({ prefs: { whatsNewSeen: "0.0.1" } });
  const dialog = app.page.getByTestId("whats-new");
  await expect(dialog).toContainText("What's new in 0.1.0");
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => ((await app.stored("app.prefs")) as { whatsNewSeen?: string }).whatsNewSeen).toBe("0.1.0");
  await app.page.reload();
  await expect(app.page.getByTestId("nav-home")).toBeVisible();
  expect(await dialog.count()).toBe(0);
  await app.page.keyboard.press(`${mod()}+k`);
  await app.page.getByTestId("command-palette").getByRole("combobox").fill("what's new");
  await app.page.getByRole("option", { name: /What's new/ }).click();
  await expect(dialog).toBeVisible();
});

test("a first run shows no What's new, and counts the version as seen", async ({ app }) => {
  await app.open();
  await expect(app.page.getByTestId("nav-home")).toBeVisible();
  expect(await app.page.getByTestId("whats-new").count()).toBe(0);
  await expect.poll(async () => ((await app.stored("app.prefs")) as { whatsNewSeen?: string }).whatsNewSeen).toBe("0.1.0");
});

test("on a phone the sidebar is a top bar whose menu opens the places in a sheet, and nothing scrolls sideways", async ({ app }) => {
  await app.page.setViewportSize({ width: 375, height: 740 });
  // Not app.open(): the places are in the sheet, so no nav row shows at first.
  await app.page.goto("/?mock=1&platform=linux");
  await expect(app.page.getByTestId("phone-bar")).toBeVisible();
  await expect(app.page.getByTestId("sidebar")).toHaveCount(0);
  await app.page.getByRole("button", { name: "Menu" }).click();
  const sheet = app.page.getByRole("dialog", { name: APP_NAME });
  await expect(sheet).toBeVisible();
  await sheet.getByTestId("nav-projects").click();
  await expect(sheet).toHaveCount(0);
  await expect(app.page.getByTestId("projects")).toBeVisible();
  await expect.poll(() => app.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Settings picks its section from a list.
  await app.page.getByRole("button", { name: "Menu" }).click();
  await app.page.getByRole("dialog", { name: APP_NAME }).getByTestId("nav-settings").click();
  await app.page.getByRole("combobox", { name: "Settings section" }).click();
  await app.page.getByRole("option", { name: "Appearance" }).click();
  await expect(app.page.getByTestId("settings-appearance")).toBeVisible();
});

test("printed, a page is its content: no sidebar, status bar or buttons", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await app.page.emulateMedia({ media: "print" });
  await expect(app.page.getByTestId("sidebar")).toBeHidden();
  await expect(app.page.getByTestId("status-bar")).toBeHidden();
  await expect(app.page.getByRole("button", { name: "Delete" })).toBeHidden();
  await expect(app.page.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await app.page.emulateMedia({ media: "screen" });
  await expect(app.page.getByTestId("sidebar")).toBeVisible();
});

test("a right-to-left page mirrors: the sidebar sits on the right, and its edge's keys follow", async ({ app }) => {
  await app.open({ params: { dir: "rtl" } });
  await expect(app.page.locator("html")).toHaveAttribute("dir", "rtl");
  const side = (await app.page.getByTestId("sidebar").boundingBox())!;
  const main = (await app.page.locator("main").boundingBox())!;
  expect(side.x).toBeGreaterThan(main.x);
  const handle = app.page.getByRole("separator", { name: "Resize the sidebar" });
  await handle.focus();
  await app.page.keyboard.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "256");
  await app.page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "240");
  // The search field's icon sits at the start, which is the right.
  await app.nav("projects").click();
  const box = (await app.page.getByRole("searchbox", { name: "Find a project" }).boundingBox())!;
  const icon = (await app.page.locator("[data-testid=projects] svg.lucide-search").first().boundingBox())!;
  expect(icon.x + icon.width / 2).toBeGreaterThan(box.x + box.width / 2);
});
