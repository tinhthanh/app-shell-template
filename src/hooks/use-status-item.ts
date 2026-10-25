import { useEffect } from "react";

import { dropStatusItem, putStatusItem, type StatusItem } from "@/lib/status-items";

// useStatusItem puts an item in the status bar while the component is
// mounted (lib/status-items.ts), and takes it away after; undefined shows
// nothing. The item is put up again when its words or tone change.
export function useStatusItem(item: StatusItem | undefined) {
  const id = item?.id;
  const label = item?.label;
  const tone = item?.tone;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the item is put up again when what it shows changes, not on every new object.
  useEffect(() => {
    if (!item) return;
    putStatusItem(item);
    return () => dropStatusItem(item.id);
  }, [id, label, tone]);
}
