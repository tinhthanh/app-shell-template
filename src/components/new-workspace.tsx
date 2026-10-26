import { PlusIcon } from "lucide-react";
import { FormDialog } from "@/components/form-dialog";
import { newWorkspaceTile } from "@/components/sidebar-rail";
import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { client } from "@/lib/api";
import { t } from "@/lib/i18n";
import { addWorkspace, leaveRecords } from "@/lib/workspace";

// The rail's "+" and its form (components/sidebar-rail.tsx draws it, lazy,
// so the form's code isn't in what the app starts with): a name, and the
// workspace is made (client.createWorkspace), added (lib/workspace.ts) and
// shown, with the keyboard on its tile.

// NewWorkspace is the rail's last tile: a name, and the workspace is made and shows.
export function NewWorkspace() {
  return (
    <FormDialog
      trigger={<button type="button" aria-label={t("shell.newWorkspace")} data-testid="new-workspace" className={newWorkspaceTile} />}
      label={<PlusIcon strokeWidth={2} />}
      title={t("shell.newWorkspace")}
      description={t("shell.newWorkspaceDescription")}
      initial={{ name: "" }}
      submit={t("common.create")}
      failTitle={t("shell.workspaceFailed")}
      onSubmit={async (v) => {
        const made = await client.createWorkspace({ name: v.name ?? "" });
        leaveRecords();
        addWorkspace(made);
        // The keyboard goes to the new tile once it is drawn, not back to "+".
        requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid=rail-workspace][data-workspace="${CSS.escape(made.id)}"]`)?.focus());
        toastManager.add({ type: "success", title: t("shell.workspaceMade", { name: made.name }) });
      }}
    >
      <Field name="name" validate={(v) => (String(v ?? "").trim() ? null : t("shell.workspaceNameRequired"))}>
        <FieldLabel>{t("shell.workspaceName")}</FieldLabel>
        <FieldControl render={<Input defaultValue="" aria-required maxLength={40} autoFocus />} />
        <FieldError />
      </Field>
    </FormDialog>
  );
}
