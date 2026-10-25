import { expect, test } from "./fixtures";

// Settings: themes, text size and density, each applied at once and kept.

const rootVar = (page: import("@playwright/test").Page, name: string) => page.evaluate((n) => document.documentElement.style.getPropertyValue(n), name);

test("themes switch the whole app and are remembered", async ({ app }) => {
  await app.open();
  const appearance = await app.openSettings("appearance");
  const seen = new Set<string>();
  for (const [id, dark] of [
    ["default-light", false],
    ["dracula", true],
    ["catppuccin-latte", false],
    ["default-dark", true],
  ] as const) {
    const card = appearance.locator(`[data-testid=theme-option][data-theme-id="${id}"]`);
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(appearance.locator("[data-testid=theme-option][aria-pressed=true]")).toHaveCount(1);
    await expect(app.page.locator("html")).toHaveClass(dark ? /(^|\s)dark(\s|$)/ : /^(?!.*(^|\s)dark(\s|$))/);
    await expect.poll(() => app.stored("app.ui")).toEqual({ themeId: id });
    seen.add(await rootVar(app.page, "--background"));
  }
  // Each theme brought its own background.
  expect(seen.size).toBe(4);
  // Found by name, too.
  await appearance.getByRole("searchbox", { name: "Find a theme" }).fill("tokyo");
  await expect(appearance.getByTestId("theme-option")).toHaveCount(1);
  // Kept across a reload.
  await app.page.reload();
  await expect(app.page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
});

test("a seeded theme and prefs load, and density and text size apply to the root", async ({ app }) => {
  await app.open({ theme: "nord", prefs: { density: "comfortable" } });
  await expect(app.page.locator("html")).toHaveAttribute("data-density", "comfortable");
  await expect(app.page.getByTestId("status-bar")).toContainText("Nord");
  const appearance = await app.openSettings("appearance");
  await appearance.getByRole("button", { name: "Compact", exact: true }).click();
  await expect(app.page.locator("html")).toHaveAttribute("data-density", "compact");
  await appearance.getByRole("button", { name: "Large", exact: true }).click();
  await expect.poll(() => app.page.evaluate(() => document.documentElement.style.fontSize)).not.toBe("");
  await expect.poll(async () => ((await app.stored("app.prefs")) as { uiFontSize?: number }).uiFontSize).toBe(14);
});

test("resetting preferences asks first, and the shortcuts list searches", async ({ app }) => {
  await app.open({ prefs: { density: "comfortable" } });
  const general = await app.openSettings("general");
  await general.getByRole("button", { name: "Reset" }).click();
  const confirm = app.page.getByTestId("confirm");
  await expect(confirm).toBeVisible();
  // The safe way out has the keyboard: Enter cancels.
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await app.page.keyboard.press("Enter");
  await expect(confirm).toHaveCount(0);
  await expect(app.page.locator("html")).toHaveAttribute("data-density", "comfortable");
  await general.getByRole("button", { name: "Reset" }).click();
  await app.page.getByTestId("confirm").getByRole("button", { name: "Reset" }).click();
  await expect(app.page.locator("html")).toHaveAttribute("data-density", "compact");

  const shortcuts = await app.openSettings("shortcuts");
  await shortcuts.getByRole("searchbox", { name: "Search shortcuts" }).fill("zoom");
  await expect(shortcuts.getByText("Zoom in")).toBeVisible();
  await expect(shortcuts.getByText("Search and commands")).toHaveCount(0);
});

test("choosing Tiếng Việt puts the app's words in Vietnamese, and it is kept", async ({ app }) => {
  await app.open({ prefs: { language: "en" } });
  const general = await app.openSettings("general");
  await expect(app.page.locator("html")).toHaveAttribute("lang", "en");
  await general.getByRole("button", { name: "Tiếng Việt", exact: true }).click();
  await expect(app.page.locator("html")).toHaveAttribute("lang", "vi");
  // The frame is drawn again in Vietnamese, on the same section.
  await expect(app.page.getByTestId("settings-nav-general")).toHaveAccessibleName("Chung");
  await expect(app.page.getByTestId("settings-general").getByText("Ngôn ngữ", { exact: true }).first()).toBeVisible();
  await expect(app.page.getByTestId("settings-general").getByRole("button", { name: "Tiếng Việt", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => ((await app.stored("app.prefs")) as { language?: string }).language).toBe("vi");
  await app.page.reload();
  await expect(app.page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(app.page.getByTestId("settings-nav-about")).toHaveAccessibleName("Giới thiệu");
});

test("Settings takes the whole window, and Back to app or Esc returns to where it was opened, filters and all", async ({ app }) => {
  await app.open({ hash: "/projects?status=paused" });
  await app.nav("settings").click();
  await expect(app.page.getByTestId("settings-general")).toBeVisible();
  // The sidebar and the status bar step aside; Settings' list is in their place.
  await expect(app.page.getByTestId("sidebar")).toHaveCount(0);
  await expect(app.page.getByTestId("status-bar")).toHaveCount(0);
  await app.page.getByTestId("settings-nav-appearance").click();
  await app.page.getByTestId("settings-back").click();
  await expect(app.page).toHaveURL(/#\/projects\?status=paused$/);
  await app.nav("settings").click();
  await expect(app.page.getByTestId("settings-general")).toBeVisible();
  await app.page.keyboard.press("Escape");
  await expect(app.page).toHaveURL(/#\/projects\?status=paused$/);
  await expect(app.page.getByTestId("status-bar")).toBeVisible();
});

test("Esc in Find a setting clears it first, and leaves Settings only after", async ({ app }) => {
  await app.open({ hash: "/settings/general" });
  const find = app.page.getByTestId("settings-find");
  await find.fill("theme");
  await find.press("Escape");
  await expect(find).toHaveValue("");
  await expect(app.page.getByTestId("settings-general")).toBeVisible();
  await find.press("Escape");
  await expect(app.page.getByTestId("settings-general")).toHaveCount(0);
});

test("Find a setting opens the section that has it, and says when nothing does", async ({ app }) => {
  await app.open({ hash: "/settings/general" });
  const find = app.page.getByTestId("settings-find");
  await find.fill("density");
  await expect(app.page.getByRole("option", { name: "Appearance" })).toBeVisible();
  await find.press("Enter");
  await expect(app.page.getByTestId("settings-appearance")).toBeVisible();
  await app.page.getByTestId("settings-find").fill("nothing like this");
  await expect(app.page.getByRole("listbox", { name: "Settings found" })).toContainText("Nothing matches");
});

test("in Vietnamese, Find a setting finds a section by its Vietnamese words", async ({ app }) => {
  await app.open({ prefs: { language: "vi" }, hash: "/settings/general" });
  await app.page.getByTestId("settings-find").fill("phím tắt");
  await app.page.getByRole("option", { name: "Phím tắt" }).click();
  await expect(app.page.getByTestId("settings-shortcuts")).toBeVisible();
});

test("Light or dark picks the themes Match system uses, and Match system follows the computer again", async ({ app }) => {
  await app.open({ hash: "/settings/appearance" });
  const page = app.page.getByTestId("settings-appearance");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(app.page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect.poll(() => app.stored("app.ui")).toEqual({ themeId: "default-light" });
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect.poll(() => app.stored("app.ui")).toEqual({ themeId: "default-dark" });
  await page.getByRole("button", { name: "Match system", exact: true }).click();
  await expect.poll(() => app.stored("app.ui")).toEqual({ themeId: "system" });
  await app.page.reload();
  await expect(app.page.getByTestId("settings-appearance").getByRole("button", { name: "Match system", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("a second open in the same test starts from the prefs it gives", async ({ app }) => {
  await app.open({ hash: "/settings/general" });
  await expect(app.page.locator("html")).toHaveAttribute("lang", "en");
  await app.open({ prefs: { language: "vi" }, hash: "/settings/general" });
  await expect(app.page.locator("html")).toHaveAttribute("lang", "vi");
  await app.page.reload();
  await expect(app.page.locator("html")).toHaveAttribute("lang", "vi");
});
