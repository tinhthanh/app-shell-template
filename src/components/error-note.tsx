import { CheckIcon, ChevronRightIcon, CircleAlertIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toastManager } from "@/components/ui/toast";
import { ApiError } from "@/lib/errors";
import { explain } from "@/lib/explain";
import { report } from "@/lib/report";
import { cn } from "@/lib/utils";

// How errors look (lib/explain.ts): a title, one sentence, a Try again
// when that can help, and what was actually said folded away under
// "Details".

// ErrorDetails is "Details": a button that opens the raw text in a dialog,
// with Copy. A button, not a <details>: a toast is too small and too
// short-lived to hold a long output.
export function ErrorDetails({ text, title, className }: { text?: string; title?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex w-fit cursor-pointer items-center gap-0.5 rounded-sm text-muted-foreground text-xs underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          />
        }
      >
        Details
        <ChevronRightIcon aria-hidden className="size-3" />
      </DialogTrigger>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Details"}</DialogTitle>
          <DialogDescription>What was said, word for word.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2">
          {/* biome-ignore lint/a11y/useSemanticElements: a <section> would not keep the text preformatted; the region is the output itself. */}
          <pre
            role="region"
            aria-label="Full output"
            className="max-h-[50vh] select-text overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/60 px-3 py-2.5 font-mono text-[12px] text-foreground/90 leading-relaxed"
          >
            {text}
          </pre>
        </div>
        <DialogFooter variant="bare">
          <DialogClose render={<Button variant="ghost" />}>Close</DialogClose>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
              } catch {
                return;
              }
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

// ErrorNote is an error in place, as an alert: what happened, what to do,
// and Try again when the caller can.
export function ErrorNote({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const e = explain(error);
  return (
    <Alert variant="error" className={className} data-testid="error-note">
      <CircleAlertIcon />
      <AlertTitle>{e.title}</AlertTitle>
      <AlertDescription>
        <span>{e.message}</span>
        <ErrorDetails text={e.details} title={e.title} />
      </AlertDescription>
      {onRetry && e.retry && (
        <AlertAction>
          <Button size="xs" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}

// toastError shows an error as a toast, in the same words. title names
// what was being done ("Couldn't save the project").
export function toastError(error: unknown, title?: string) {
  // A server's refusal is expected; anything else is a bug worth reporting.
  if (!(error instanceof ApiError)) report(error, { where: title ?? "toastError" });
  const e = explain(error);
  toastManager.add({ type: "error", title: title ?? e.title, description: title ? `${e.title}. ${e.message}` : e.message });
}
