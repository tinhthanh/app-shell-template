import { expect, test } from "./fixtures";

// The shared form (components/form-dialog.tsx), on the Kit's example: what
// counts as an edit, whichever kind of field it is in.

test("changing only a choice counts as an edit: closing asks first, and saving keeps it", async ({ app }) => {
  await app.open({ hash: "/kit/overlays" });
  await app.page.getByRole("button", { name: "Open a form" }).click();
  const dialog = app.page.getByRole("dialog", { name: "New report" });
  const kind = dialog.getByRole("combobox", { name: "How often" });
  await kind.click();
  await app.page.getByRole("option", { name: "Monthly" }).click();
  await expect(kind).toContainText("Monthly");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  const confirm = app.page.getByTestId("confirm");
  await expect(confirm).toContainText("Discard your changes?");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "comes monthly" })).toBeVisible();
});

test("a form opened and closed with nothing changed closes without asking", async ({ app }) => {
  await app.open({ hash: "/kit/overlays" });
  await app.page.getByRole("button", { name: "Open a form" }).click();
  const dialog = app.page.getByRole("dialog", { name: "New report" });
  await expect(dialog).toBeVisible();
  await app.page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(app.page.getByTestId("confirm")).toHaveCount(0);
});
