import { toastError } from "@/components/error-note";
import { toastManager } from "@/components/ui/toast";
import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import { invalidate, optimistic } from "@/lib/resource-cache";

// setStatuses is a bulk status change, the way the app does them (a
// BulkBar's "Set the status"): each record in its new status at once
// (optimistic, lib/resource-cache.ts), the lists read again once when they
// are all in; what the server refused goes back, said in one toast; what it
// took is said with Undo, which puts each back as it was (not all to one
// status). A resource gives its records, its write and its words.
export async function setStatuses<T extends { id: string; status: S }, S extends string>(o: {
  // Each record's id and the status it goes to.
  to: Map<string, S>;
  // The rows on show, for what each was before.
  rows: readonly T[];
  key(id: string): string;
  listKey: string;
  write(id: string, status: S): Promise<T>;
  // The words: "3 projects are now archived", "Couldn't update 2 projects", "Put back as it was".
  words: { done(n: number, status: S): string; failed(n: number): string; undone: string };
  // For usage (lib/analytics.ts): the record's kind.
  kind: string;
  undoing?: boolean;
}): Promise<void> {
  const was = new Map(o.rows.filter((r) => o.to.has(r.id)).map((r) => [r.id, r.status]));
  const results = await Promise.allSettled(
    [...o.to].map(([id, status]) => optimistic<T>({ key: o.key(id), listKey: o.listKey, id, patch: { status } as Partial<T>, write: () => o.write(id, status), invalidate: false })),
  );
  invalidate(o.listKey);
  const failed = results.flatMap((r) => (r.status === "rejected" ? [r.reason] : []));
  if (failed.length) toastError(failed[0], o.words.failed(failed.length));
  const took = results.flatMap((r) => (r.status === "fulfilled" ? [r.value.id] : []));
  if (!took.length) return;
  if (o.undoing) {
    toastManager.add({ type: "success", title: o.words.undone });
    return;
  }
  const status = [...o.to.values()][0] as S;
  track("record.status", { kind: o.kind, status });
  const back = new Map(took.flatMap((id) => (was.has(id) ? [[id, was.get(id) as S] as const] : [])));
  toastManager.add({
    type: "success",
    title: o.words.done(took.length, status),
    actionProps: { children: t("common.undo"), onClick: () => void setStatuses({ ...o, to: back, undoing: true }) },
  });
}
