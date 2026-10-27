import { confirm } from "@/components/confirm";
import { toastManager } from "@/components/ui/toast";
import { t } from "@/lib/i18n";
import { editRows } from "@/lib/pages";
import { forget, invalidate, listsOf, mutate } from "@/lib/resource-cache";
import type { Page } from "@/lib/types";

// dropRows takes deleted records out of every kept list of the resource, not
// only the one they were deleted from, and has the lists on screen read
// again (the totals and the next page's cursor are the server's to say).
export function dropRows(listKey: string, ids: readonly string[]) {
  const gone = new Set(ids);
  for (const k of new Set([listKey, ...listsOf(listKey)])) mutate<{ id: string }[] | Page<{ id: string }>>(k, (l) => editRows(l, (rows) => rows.filter((x) => !gone.has(x.id))));
  invalidate(listKey);
}

// removeRecord deletes a record the way the app does it: a confirm that
// names it, the call, the record forgotten and its row taken out of the
// list, a toast, then whatever comes next (back to the list). The confirm
// explains a failure itself (the call throws through it).
export function removeRecord(o: {
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
      dropRows(o.listKey, [o.id]);
      toastManager.add({ type: "success", title: t("common.remove.done", { name: o.name }) });
      o.after?.();
    },
  });
}
