import type { ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";

import { confirm } from "@/components/confirm";
import { toastError } from "@/components/error-note";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ApiError } from "@/lib/api";

// FormDialog is a form in a dialog, the way the app does them, so a view
// writes its fields and its save and gets the rest: the trigger, a busy
// Save, a dirty check (closing with edits in the fields asks first), the
// app's own field errors, and the server's refusal put on the field it
// names (an ApiError with code "invalid"; without a field, on the first).
// Any other failure is a toast with failTitle. onSubmit gets the values
// trimmed, and the dialog closes when it resolves.
export interface FormDialogProps {
  // What opens the dialog (a Button), with icon and label as its children.
  trigger: ReactElement;
  icon?: ReactNode;
  label: ReactNode;
  title: string;
  description?: string;
  // Each field's value as it starts: the dirty check compares with these,
  // and the first is where a refusal that names no field lands.
  initial: Record<string, string>;
  submit: string;
  failTitle: string;
  onSubmit(values: Record<string, string>): Promise<void>;
  // The Fields (components/ui/field.tsx).
  children: ReactNode;
}

export function FormDialog({ trigger, icon, label, title, description, initial, submit, failTitle, onSubmit, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const close = () => {
    setOpen(false);
    setDirty(false);
    setErrors({});
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return setOpen(true);
        if (!dirty) return close();
        // Esc, the backdrop or Cancel with edits in the fields: ask first.
        confirm({ title: "Discard your changes?", description: "What you typed here will be lost.", confirm: "Discard", destructive: true, run: close });
      }}
    >
      <DialogTrigger render={trigger}>
        {icon}
        {label}
      </DialogTrigger>
      <DialogPopup>
        {/* The form is the popup's one child, laid out as the popup lays out
            its header, panel and footer, so the panel scrolls on a short window. */}
        <Form
          ref={form}
          className="flex min-h-0 flex-1 flex-col"
          errors={errors}
          onChange={() => {
            const f = new FormData(form.current ?? undefined);
            setDirty(Object.keys(initial).some((k) => String(f.get(k) ?? "") !== initial[k]));
          }}
          onFormSubmit={async (values) => {
            setErrors({});
            setBusy(true);
            const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v ?? "").trim()]));
            try {
              await onSubmit(trimmed);
              close();
            } catch (err) {
              if (err instanceof ApiError && err.code === "invalid") setErrors({ [err.field ?? Object.keys(initial)[0] ?? "form"]: err.message });
              else toastError(err, failTitle);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">{children}</DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button type="submit" loading={busy}>
              {submit}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
