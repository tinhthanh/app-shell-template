import { expect, test } from "./fixtures";

// Picking rows and acting on them all (DataTable's selection, BulkBar, the
// projects' bulk status with Undo and bulk delete).

const row = (app: { page: import("@playwright/test").Page }, id: string) => app.page.locator(`[data-testid=project-row][data-project=${id}]`);

test("Space picks the row the keyboard is on and Enter still opens it; Esc lets the picks go", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await row(app, "p-shop").focus();
  await app.page.keyboard.press("Space");
  await expect(app.page.getByTestId("bulk-count")).toHaveText("1 selected");
  await expect(row(app, "p-shop")).toHaveAttribute("data-selected", "true");
  await app.page.keyboard.press("Escape");
  await expect(app.page.getByTestId("bulk-bar")).toHaveCount(0);
  await app.page.keyboard.press("Enter");
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
});

test("Shift picks the rows between, and the header box picks every row shown", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await row(app, "p-shop").getByTestId("select-row").click();
  await row(app, "p-ios")
    .getByTestId("select-row")
    .click({ modifiers: ["Shift"] });
  await expect(app.page.getByTestId("bulk-count")).toHaveText("3 selected");
  await expect(app.page.getByTestId("select-all")).toHaveAttribute("aria-checked", "mixed");
  await app.page.getByTestId("select-all").click();
  await expect(app.page.getByTestId("bulk-count")).toHaveText("8 selected");
  // A click on a box picks; it doesn't open the row.
  await expect(app.page.getByTestId("project-detail")).toHaveCount(0);
});

test("a status set on the picked projects shows at once, and Undo puts each back as it was", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await row(app, "p-shop").getByTestId("select-row").click();
  await row(app, "p-android").getByTestId("select-row").click();
  await app.page.getByTestId("bulk-status").click();
  await app.page.getByRole("menuitem", { name: "Archived" }).click();
  await expect(row(app, "p-shop")).toContainText("Archived", { ignoreCase: true });
  await expect(row(app, "p-android")).toContainText("Archived", { ignoreCase: true });
  await expect(app.page.getByTestId("bulk-bar")).toHaveCount(0);
  const toast = app.page.locator("[data-slot=toast-title]", { hasText: "2 projects are now archived" });
  await expect(toast).toBeVisible();
  await app.page.getByRole("button", { name: "Undo" }).click();
  await expect(row(app, "p-shop")).toContainText("Active", { ignoreCase: true });
  await expect(row(app, "p-android")).toContainText("Paused", { ignoreCase: true });
});

test("a bulk status the server refuses goes back, with a toast", async ({ app }) => {
  await app.open({ params: { failWrites: "1" }, hash: "/projects" });
  await row(app, "p-shop").getByTestId("select-row").click();
  await app.page.getByTestId("bulk-status").click();
  await app.page.getByRole("menuitem", { name: "Paused" }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Couldn't update 1 project" })).toBeVisible();
  await expect(row(app, "p-shop")).toContainText("Active", { ignoreCase: true });
});

test("deleting the picked projects asks first, and they leave the list", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await row(app, "p-shop").getByTestId("select-row").click();
  await row(app, "p-api").getByTestId("select-row").click();
  await app.page.getByTestId("bulk-bar").getByRole("button", { name: "Delete" }).click();
  const confirm = app.page.getByTestId("confirm");
  await expect(confirm).toContainText("Delete 2 projects?");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "2 projects were deleted" })).toBeVisible();
  await expect(app.page.getByTestId("project-row")).toHaveCount(6);
  await expect(row(app, "p-shop")).toHaveCount(0);
});

test("a viewer has no boxes to pick with", async ({ app }) => {
  await app.open({ params: { role: "viewer" }, hash: "/projects" });
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  await expect(app.page.getByTestId("select-row")).toHaveCount(0);
  await expect(app.page.getByTestId("select-all")).toHaveCount(0);
});

test("the picks are let go when the filters change", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await row(app, "p-shop").getByTestId("select-row").click();
  await expect(app.page.getByTestId("bulk-count")).toHaveText("1 selected");
  await app.page.getByTestId("bulk-bar").getByRole("button", { name: "Clear the selection" }).click();
  await app.page.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.getByTestId("project-row")).toHaveCount(1);
  await row(app, "p-android").getByTestId("select-row").click();
  await app.page.evaluate(() => {
    location.hash = "#/projects";
  });
  await expect(app.page.getByTestId("project-row")).toHaveCount(8);
  await expect(app.page.getByTestId("bulk-bar")).toHaveCount(0);
});

test("letting the picks go leaves the keyboard on the list, not on the page", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await row(app, "p-shop").getByTestId("select-row").click();
  await app.page.getByTestId("bulk-bar").getByRole("button", { name: "Clear the selection" }).click();
  await expect(app.page.getByTestId("bulk-bar")).toHaveCount(0);
  await expect(app.page.locator("[data-testid=project-row]:focus")).toHaveCount(1);
});
