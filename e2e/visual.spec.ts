import { expect, test } from "./fixtures";
import scenes from "./scenes.json" with { type: "json" };

// Every scene, in Default Dark and Default Light, against the baselines in
// e2e/snapshots/ (Linux renderings: CI's, or pnpm test:visual's). A change
// in how anything looks fails here, so a PR that means to change the look
// updates the baselines (pnpm test:visual --update) and commits them, and
// the review sees the pictures.
//
// The fixtures' times are relative to now (12 minutes ago), so they read
// the same on every run; what moves is frozen before the picture.

// The scenes are e2e/scenes.json, which pnpm shots reads too: a new view
// goes there once and is in both. ready is the testid that says the view
// has its data.
const SCENES = scenes as { id: string; hash: string; ready: string; width?: number }[];

for (const theme of ["default-dark", "default-light"]) {
  for (const scene of SCENES) {
    test(`${scene.id} looks as it did in ${theme}`, async ({ app }) => {
      if (scene.width) await app.page.setViewportSize({ width: scene.width, height: 740 });
      await app.page.addInitScript((t) => localStorage.setItem("app.ui", JSON.stringify({ themeId: t })), theme);
      await app.page.goto(`/?mock=1&platform=linux${scene.hash}`);
      await expect(app.page.getByTestId(scene.ready).first()).toBeVisible();
      // Fonts in, and every animation that ends ended (a spinner never does;
      // toHaveScreenshot freezes it).
      await app.page.evaluate(() =>
        Promise.all([
          document.fonts.ready,
          ...document
            .getAnimations()
            .filter((x) => x.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY)
            .map((x) => x.finished.catch(() => {})),
        ]),
      );
      await expect(app.page).toHaveScreenshot(`${scene.id}-${theme.replace("default-", "")}.png`);
    });
  }
}
