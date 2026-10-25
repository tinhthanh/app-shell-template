import { useEffect, useState } from "react";

import { useStatusItem } from "@/hooks/use-status-item";
import { announce } from "@/lib/announce";
import { t } from "@/lib/i18n";

// useOnlineStatus says in the status bar when the computer is offline, and
// tells a screen reader when it goes and comes back. Reads made meanwhile
// fail and are tried again by the client (lib/api.ts); a view's Reload or
// Try again picks up once it is back.
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const up = () => {
      setOnline(true);
      announce(t("shell.backOnline"));
    };
    const down = () => {
      setOnline(false);
      announce(t("shell.offlineTip"), true);
    };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  useStatusItem(online ? undefined : { id: "offline", label: t("shell.offline"), tip: t("shell.offlineTip"), tone: "warning", order: 0 });
}
