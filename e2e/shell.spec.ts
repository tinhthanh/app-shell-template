import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The shell: the sidebar's places, the palette, the shortcuts and what the
// app remembers between launches.

const mod = process.platform === "darwin" ? "Meta" : "Control";

test("the sidebar's places open their views, and ⌘1–9 jump to them", async ({ app }) => {
  await app.open();
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
  await expect(app.page).toHaveTitle("Projects — App Shell");
  await app.page.keyboard.press(`${mod}+1`);
  await expect(app.page.getByRole("heading", { name: "Home" })).toBeVisible();
  await app.page.keyboard.press(`${mod}+3`);
  await expect(app.page.getByTestId("settings-general")).toBeVisible();
});

test("the palette opens with ⌘K, finds a place and goes there", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod}+k`);
  const palette = app.page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await palette.getByRole("combobox").fill("proj");
  await palette.getByRole("option", { name: /Projects/ }).click();
  await expect(palette).toHaveCount(0);
  await expect(app.page.getByTestId("projects")).toBeVisible();
});

test("highlighting a theme in the palette previews it, and Esc puts the old one back", async ({ app }) => {
  await app.open();
  const html = app.page.locator("html");
  await app.page.keyboard.press(`${mod}+k`);
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
  await app.page.keyboard.press(`${mod}+\\`);
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
  await app.page.keyboard.press(`${mod}+/`);
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
