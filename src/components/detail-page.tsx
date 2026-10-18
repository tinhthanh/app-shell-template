import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ResourceView } from "@/components/resource-view";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { Resource } from "@/lib/resource";
import type { View } from "@/lib/store";
import { ViewHeader } from "@/views/view-header";

// DetailPage is the shape of one record's page: a back button (which has
// the focus when the page opens), the crumb to the list, the record's
// name as the title (an ellipsis until it is read), the actions on the
// right, and the record drawn through ResourceView with its loading and
// failed states. The view gives the record and what to show of it.
export function DetailPage<T>({
  testid,
  resource,
  label,
  title,
  crumb,
  onBack,
  actions,
  children,
}: {
  testid: string;
  resource: Resource<T>;
  // What the loader says: "Reading the project…".
  label: string;
  title?: string;
  // The list this is under, and what to call it: { label: "Projects", view }.
  crumb: { label: string; view: View };
  // Back to the list; the view says which row gets the keyboard (returnFocusTo).
  onBack(): void;
  actions?: ReactNode;
  children(data: T): ReactNode;
}) {
  return (
    <div className="flex h-full flex-col" data-testid={testid}>
      <ViewHeader
        leading={
          <Button size="icon-xs" variant="ghost" aria-label={t("common.backTo", { name: crumb.label.toLowerCase() })} data-autofocus onClick={onBack}>
            <ArrowLeftIcon />
          </Button>
        }
        crumbs={[crumb]}
        title={title ?? "…"}
        actions={actions}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ResourceView resource={resource} label={label} testid={testid.replace(/-detail$/, "")}>
          {children}
        </ResourceView>
      </div>
    </div>
  );
}
