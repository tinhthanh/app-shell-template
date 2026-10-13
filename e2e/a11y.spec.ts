import AxeBuilder from "@axe-core/playwright";

import { type App, expect, test } from "./fixtures";

// axe-core over the app's screens, in Default Dark: no serious or critical
// violation of WCAG 2.2 A and AA, or of axe's best practices. A11Y_FULL=1
// adds Default Light. check:themes covers each theme's contrast on every run.

test.use({ reducedMotion: "reduce" });

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const scenes: { id: string; run(app: App): Promise<void> }[] = [
  { id: "home", run: async (app) => void (await expect(app.page.getByRole("heading", { name: "Home" })).toBeVisible()) },
  {
    id: "projects",
    run: async (app) => {
      await app.nav("projects").click();
      await expect(app.page.getByTestId("project-row").first()).toBeVisible();
    },
  },
  {
    id: "project detail",
    run: async (app) => {
      await app.nav("projects").click();
      await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
      await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
    },
  },
  { id: "settings appearance", run: async (app) => void (await app.openSettings("appearance")) },
  { id: "settings general", run: async (app) => void (await app.openSettings("general")) },
  { id: "settings shortcuts", run: async (app) => void (await app.openSettings("shortcuts")) },
  {
    id: "palette",
    run: async (app) => {
      await app.page.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+k`);
      await expect(app.page.getByTestId("command-palette")).toBeVisible();
    },
  },
  {
    id: "rail",
    run: async (app) => {
      await app.page.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+\\`);
      await expect(app.page.getByTestId("sidebar-rail")).toBeVisible();
    },
  },
];

const themes = process.env.A11Y_FULL === "1" ? ["default-dark", "default-light"] : ["default-dark"];

for (const theme of themes) {
  for (const scene of scenes) {
    test(`${scene.id} in ${theme} has no serious accessibility problems`, async ({ app }) => {
      await app.open({ theme });
      await scene.run(app);
      // Animations finish first, so contrast is read at rest.
      await app.page.waitForTimeout(250);
      const r = await new AxeBuilder({ page: app.page }).withTags(TAGS).exclude("[data-a11y-skip]").analyze();
      const bad = r.violations.filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => `${x.id} (${x.impact}): ${x.help}\n  ${x.nodes.map((n) => n.target.join(" ")).slice(0, 5).join("\n  ")}`);
      expect(bad, "serious or critical axe violations").toEqual([]);
    });
  }
}
