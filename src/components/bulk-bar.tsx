import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

// BulkBar takes the toolbar's place while rows are picked (DataTable's
// selection): how many, what can be done to them all (the view's buttons),
// and a way to let go. A screen reader hears the count change.
export function BulkBar({ count, onClear, children }: { count: number; onClear(): void; children: ReactNode }) {
  return (
    <div role="toolbar" aria-label={t("common.select.actions")} className="flex flex-wrap items-center gap-2 border-b bg-accent/30 px-page py-2" data-testid="bulk-bar" data-print="hide">
      <span role="status" className="me-2 text-label tabular-nums" data-testid="bulk-count">
        {t("common.select.count", { n: count })}
      </span>
      {children}
      <Button size="sm" variant="ghost" className="ms-auto" onClick={onClear} aria-label={t("common.select.clear")}>
        <XIcon />
        {t("common.select.clear")}
      </Button>
    </div>
  );
}
