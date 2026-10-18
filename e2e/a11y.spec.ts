import AxeBuilder from "@axe-core/playwright";

import { KIT_SECTIONS } from "../src/views/kit/sections";
import { type App, expect, mod, test } from "./fixtures";

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
  ...KIT_SECTIONS.map(({ id }) => ({
    id: `kit ${id}`,
    run: async (app: App) => {
      await app.page.goto(`/?mock=1#/kit/${id}`);
      await expect(app.page.getByTestId(`kit-${id}`)).toBeVisible();
    },
  })),
  { id: "settings appearance", run: async (app) => void (await app.openSettings("appearance")) },
  { id: "settings general", run: async (app) => void (await app.openSettings("general")) },
  { id: "settings shortcuts", run: async (app) => void (await app.openSettings("shortcuts")) },
  { id: "settings about", run: async (app) => void (await app.openSettings("about")) },
  {
    id: "confirm dialog",
    run: async (app) => {
      await app.openSettings("general");
      await app.page.getByRole("button", { name: "Reset" }).click();
      await expect(app.page.getByTestId("confirm")).toBeVisible();
    },
  },
  {
    id: "edit dialog with a field error",
    run: async (app) => {
      await app.open({ hash: "/projects/p-shop" });
      await app.page.getByRole("button", { name: "Edit the project" }).click();
      const dialog = app.page.getByRole("dialog", { name: "Edit the project" });
      await dialog.getByRole("textbox", { name: "Name" }).fill("");
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(dialog.getByText("A project needs a name.")).toBeVisible();
    },
  },
  {
    id: "new project dialog",
    run: async (app) => {
      await app.nav("projects").click();
      await app.page.getByRole("button", { name: "New project" }).click();
      await expect(app.page.getByRole("dialog", { name: "New project" })).toBeVisible();
    },
  },
  {
    id: "sign in",
    run: async (app) => {
      await app.open({ params: { signedOut: "1" } });
      await expect(app.page.getByTestId("signin")).toBeVisible();
    },
  },
  {
    id: "what's new",
    run: async (app) => {
      await app.openSettings("about");
      await app.page.getByRole("button", { name: "What's new" }).click();
      await expect(app.page.getByTestId("whats-new")).toBeVisible();
    },
  },
  {
    id: "shortcuts sheet",
    run: async (app) => {
      await app.page.keyboard.press(`${mod()}+/`);
      await expect(app.page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    },
  },
  {
    id: "projects failed with details open",
    run: async (app) => {
      await app.open({ params: { fail: "1" }, hash: "/projects" });
      await app.page.getByTestId("error-note").getByRole("button", { name: "Details" }).click();
      await expect(app.page.getByLabel("Full output")).toBeVisible();
    },
  },
  {
    id: "projects with a page that didn't come",
    run: async (app) => {
      await app.open({ params: { many: "1", failMore: "1" }, hash: "/projects" });
      await app.page.getByTestId("project-row").first().focus();
      await app.page.keyboard.press("End");
      await expect(app.page.getByTestId("more-rows").getByRole("button", { name: "Try again" })).toBeVisible();
    },
  },
  {
    id: "project detail as a viewer",
    run: async (app) => {
      await app.open({ params: { role: "viewer" }, hash: "/projects/p-shop" });
      await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
    },
  },
  {
    id: "projects empty",
    run: async (app) => {
      await app.open({ params: { empty: "1" }, hash: "/projects" });
      await expect(app.page.getByTestId("projects-empty")).toBeVisible();
    },
  },
  {
    id: "phone with the menu open",
    run: async (app) => {
      await app.page.setViewportSize({ width: 375, height: 740 });
      await app.page.getByRole("button", { name: "Menu" }).click();
      await expect(app.page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    id: "narrow window",
    run: async (app) => {
      await app.page.setViewportSize({ width: 700, height: 800 });
      await app.nav("projects").click();
      await expect(app.page.getByTestId("projects")).toBeVisible();
    },
  },
  {
    id: "palette",
    run: async (app) => {
      await app.page.keyboard.press(`${mod()}+k`);
      await expect(app.page.getByTestId("command-palette")).toBeVisible();
    },
  },
  {
    id: "rail",
    run: async (app) => {
      await app.page.keyboard.press(`${mod()}+\\`);
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
      await app.page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
            .map((a) => a.finished.catch(() => {})),
        ),
      );
      const r = await new AxeBuilder({ page: app.page }).withTags(TAGS).exclude("[data-a11y-skip]").analyze();
      const bad = r.violations
        .filter((x) => x.impact === "serious" || x.impact === "critical")
        .map(
          (x) =>
            `${x.id} (${x.impact}): ${x.help}\n  ${x.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 5)
              .join("\n  ")}`,
        );
      expect(bad, "serious or critical axe violations").toEqual([]);
    });
  }
}
