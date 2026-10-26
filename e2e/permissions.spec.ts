import { expect, test } from "./fixtures";

// What a person may do follows their role (lib/permissions.ts): what isn't
// theirs to do isn't offered, and the server (the mock, ?role=) refuses it
// anyway.

test("a viewer sees the projects but no way to create, edit or delete one", async ({ app }) => {
  await app.open({ params: { role: "viewer" }, hash: "/projects" });
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  await expect(app.page.getByRole("button", { name: "New project" })).toHaveCount(0);
  await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Edit the project" })).toHaveCount(0);
  await expect(detail.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await expect(detail.getByRole("group", { name: "Status" })).toHaveCount(0);
});

test("a viewer is offered no new workspace on the rail", async ({ app }) => {
  await app.open({ params: { role: "viewer" }, hash: "/projects" });
  await expect(app.page.locator("[data-testid=rail-workspace]").first()).toBeVisible();
  await expect(app.page.getByTestId("new-workspace")).toHaveCount(0);
});

test("a viewer's empty list says someone else adds the first, with no button", async ({ app }) => {
  await app.open({ params: { role: "viewer", empty: "1" }, hash: "/projects" });
  const empty = app.page.getByTestId("projects-empty");
  await expect(empty).toBeVisible();
  await expect(empty.getByRole("button", { name: "New project" })).toHaveCount(0);
});

test("a member creates and edits, but has no Delete", async ({ app }) => {
  await app.open({ params: { role: "member" }, hash: "/projects/p-shop" });
  const detail = app.page.getByTestId("project-detail");
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Shop is now paused" })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Edit the project" })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await detail.getByRole("button", { name: "Back to projects" }).click();
  await expect(app.page.getByTestId("projects").getByRole("button", { name: "New project" })).toBeVisible();
});

test("the account menu says which role you have", async ({ app }) => {
  await app.open({ params: { role: "member" } });
  await app.page.getByTestId("account").click();
  await expect(app.page.getByTestId("account-role")).toHaveText("Member");
});
