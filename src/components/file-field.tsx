import { XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fileSize } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Attachment } from "@/lib/types";

// FileField is a form's one file: the file kept (its name and size, and a way
// to take it off) or a new one picked. The form reads what to do from
// choice when it saves: keep the kept one, send a new one (client.uploadFile),
// or take it off. A refusal on the field's name (too big) shows under it.
export type FileChoice = { kind: "keep" } | { kind: "new"; file: File } | { kind: "none" };

export function FileField({ name, label, hint, kept, accept, onChoice }: { name: string; label: string; hint?: string; kept?: Attachment; accept?: string; onChoice(choice: FileChoice): void }) {
  const [showKept, setShowKept] = useState(Boolean(kept));
  return (
    <Field name={name}>
      <FieldLabel>{label}</FieldLabel>
      {kept && showKept ? (
        <span className="flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-body" data-testid={`${name}-kept`}>
          <span className="min-w-0 flex-1 truncate">{kept.name}</span>
          <span className="text-muted-foreground text-meta tabular-nums">{fileSize(kept.size)}</span>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t("common.file.remove", { name: kept.name })}
            onClick={() => {
              setShowKept(false);
              onChoice({ kind: "none" });
            }}
          >
            <XIcon />
          </Button>
        </span>
      ) : (
        <FieldControl
          render={<Input type="file" accept={accept} />}
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            onChoice(file ? { kind: "new", file } : { kind: "none" });
          }}
        />
      )}
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError />
    </Field>
  );
}
