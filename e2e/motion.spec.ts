import { expect, test } from "./fixtures";

// Motion holds still when asked: the OS's reduce-motion setting stops the
// decorative animations, and a window in the background pauses them
// (lib/still.ts), so a hidden app costs nothing.

test("with reduce motion on, the loader's grid and shimmer don't animate", async ({ app }) => {
  await app.page.emulateMedia({ reducedMotion: "reduce" });
  await app.open({ hash: "/kit/feedback" });
  const cell = app.page.locator(".px-grid i").first();
  await expect(cell).toBeVisible();
  await expect.poll(() => cell.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await expect
    .poll(() =>
      app.page
        .locator(".shimmer")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
});

test("a hidden window pauses the decorative animations, and a visible one starts them again", async ({ app }) => {
  await app.open({ hash: "/kit/feedback" });
  const shimmer = app.page.locator(".shimmer").first();
  await expect(shimmer).toBeVisible();
  await expect.poll(() => shimmer.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
  await app.page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(app.page.locator("html")).toHaveAttribute("data-app-still", "");
  await expect.poll(() => shimmer.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
  await app.page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(app.page.locator("html")).not.toHaveAttribute("data-app-still", "");
});
