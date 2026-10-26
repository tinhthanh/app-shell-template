import { useEffect, useRef } from "react";

import { dropStatusItem, putStatusItem, type StatusItem } from "@/lib/status-items";

// useStatusItem puts an item in the status bar while the component is
// mounted (lib/status-items.ts), and takes it away after; undefined shows
// nothing. It is put up again when its words, tone or tip change; a click
// always runs the latest handler. An id is one item: two components must
// not share one, or the first to unmount takes the other's away.
export function useStatusItem(item: StatusItem | undefined) {
  const latest = useRef(item);
  latest.current = item;
  const id = item?.id;
  const label = item?.label;
  const tone = item?.tone;
  const tip = item?.tip;
  const order = item?.order;
  const clickable = Boolean(item?.onClick);
  useEffect(() => {
    if (!id || label === undefined) return;
    putStatusItem({ id, label, tone, tip, order, ...(clickable ? { onClick: () => latest.current?.onClick?.() } : {}) });
    return () => dropStatusItem(id);
  }, [id, label, tone, tip, order, clickable]);
}
