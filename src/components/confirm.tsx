import { type ReactNode, useRef, useState } from "react";
import { create } from "zustand";

import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { plainError } from "@/lib/explain";
import { t } from "@/lib/i18n";

// confirm asks before something that cannot be undone, from anywhere (a
// menu item has no room for its own dialog):
//
//   confirm({ title: "Delete the project?", description: "…", confirm: "Delete", destructive: true, run: () => client.remove(id) });
//
// Options become checkboxes, and run gets their values. If run throws, the
// dialog stays open with the error, so the person can try again. App.tsx
// mounts ConfirmHost once.

export interface ConfirmOption {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
}

export interface ConfirmRequest {
  title: string;
  description: ReactNode;
  // The thing it acts on, shown on its own line: a name, a path.
  detail?: ReactNode;
  confirm: string;
  destructive?: boolean;
  options?: ConfirmOption[];
  run(checked: Record<string, boolean>): Promise<void> | void;
}

const useConfirm = create<{ req?: ConfirmRequest }>()(() => ({}));

export function confirm(req: ConfirmRequest) {
  useConfirm.setState({ req });
}

export function ConfirmHost() {
  const req = useConfirm((s) => s.req);
  return (
    <AlertDialog open={!!req} onOpenChange={(o) => !o && useConfirm.setState({ req: undefined })}>
      {req && <Body key={req.title} req={req} />}
    </AlertDialog>
  );
}

function Body({ req }: { req: ConfirmRequest }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const button = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  // Where the keyboard starts: the safe way out when it destroys something,
  // so Enter right after it opens never destroys; else confirm.
  const start = req.destructive ? cancel : button;
  return (
    <AlertDialogPopup initialFocus={start} data-testid="confirm">
      <AlertDialogHeader>
        <AlertDialogTitle>{req.title}</AlertDialogTitle>
        <AlertDialogDescription>{req.description}</AlertDialogDescription>
      </AlertDialogHeader>
      {(req.detail || req.options?.length || error) && (
        <div className="flex flex-col gap-3 px-6 pb-2 text-sm">
          {req.detail && <div className="rounded-md bg-muted/60 px-3 py-2 font-mono text-xs leading-relaxed">{req.detail}</div>}
          {req.options?.map((o) => (
            <label key={o.id} className="flex items-start gap-2.5">
              <Checkbox className="mt-0.5" checked={!!checked[o.id]} onCheckedChange={(v) => setChecked((c) => ({ ...c, [o.id]: !!v }))} />
              <span>
                {o.label}
                {o.hint && <span className="block text-muted-foreground text-xs">{o.hint}</span>}
              </span>
            </label>
          ))}
          {error && (
            <p role="alert" className="text-destructive-foreground text-xs">
              {error}
            </p>
          )}
        </div>
      )}
      <AlertDialogFooter>
        <AlertDialogClose ref={cancel} render={<Button variant="ghost" />}>
          {t("common.cancel")}
        </AlertDialogClose>
        <Button
          ref={button}
          variant={req.destructive ? "destructive" : "default"}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(undefined);
            try {
              await req.run(checked);
              useConfirm.setState({ req: undefined });
            } catch (err) {
              setError(plainError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {req.confirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogPopup>
  );
}
