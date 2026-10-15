import { confirm } from "@/components/confirm";
import { toastManager } from "@/components/ui/toast";
import { forget, mutate } from "@/lib/resource-cache";

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
    title: `Delete ${o.name}?`,
    description: o.description,
    detail: o.name,
    confirm: "Delete",
    destructive: true,
    run: async () => {
      await o.remove();
      forget(o.key);
      mutate<T[]>(o.listKey, (l) => l?.filter((x) => x.id !== o.id));
      toastManager.add({ type: "success", title: `${o.name} was deleted` });
      o.after?.();
    },
  });
}
