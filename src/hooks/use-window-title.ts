import { useEffect } from "react";

import { APP_NAME } from "@/lib/app";
import { useStore } from "@/lib/store";

// useWindowTitle names the window after the view in front ("Settings — App").
export function useWindowTitle(titles: Record<string, string>) {
  const kind = useStore((s) => s.view.kind);
  useEffect(() => {
    const label = titles[kind];
    const title = label ? `${label} — ${APP_NAME}` : APP_NAME;
    if (document.title !== title) document.title = title;
  }, [kind, titles]);
}
