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
