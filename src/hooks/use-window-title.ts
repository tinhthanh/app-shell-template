import { useEffect } from "react";

import { APP_NAME } from "@/lib/app";
import { useStore } from "@/lib/store";
import { useTitleDetail } from "@/lib/title";

// useWindowTitle names the window after what is in front: the record, then
// the view, then the app ("Shop — Projects — App Shell"), for tabs, history
// and screen readers.
export function useWindowTitle(titles: Record<string, string>) {
  const kind = useStore((s) => s.view.kind);
  const detail = useTitleDetail((s) => s.detail);
  useEffect(() => {
    const title = [detail, titles[kind], APP_NAME].filter(Boolean).join(" — ");
    if (document.title !== title) document.title = title;
  }, [kind, titles, detail]);
}
