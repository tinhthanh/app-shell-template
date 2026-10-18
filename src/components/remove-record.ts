import { confirm } from "@/components/confirm";
import { toastManager } from "@/components/ui/toast";
import { t } from "@/lib/i18n";
import { editRows } from "@/lib/pages";
import { forget, mutate } from "@/lib/resource-cache";
import type { Page } from "@/lib/types";

// removeRecord deletes a record the way the app does it: a confirm that
// names it, the call, the record forgotten and its row taken out of the
// list, a toast, then whatever comes next (back to the list). The confirm
// explains a failure itself (the call throws through it).
export function removeRecord<T extends { id: string }>(o: {
  // What the confirm and the toast call it: the record's name.
  name: string;
  // What goes with it: "The project and its history go for good."
  description: string;
  key: string;
  listKey: string;
  id: string;
  remove(): Promise<void>;
  after?(): void;
}) {
  confirm({
    title: t("common.remove.title", { name: o.name }),
    description: o.description,
    detail: o.name,
    confirm: t("common.delete"),
    destructive: true,
    run: async () => {
      await o.remove();
      forget(o.key);
      mutate<T[] | Page<T>>(o.listKey, (l) => editRows(l, (rows) => rows.filter((x) => x.id !== o.id)));
      toastManager.add({ type: "success", title: t("common.remove.done", { name: o.name }) });
      o.after?.();
    },
  });
}
