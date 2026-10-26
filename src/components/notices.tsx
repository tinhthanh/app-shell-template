import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { toastManager } from "@/components/ui/toast";
import { ago } from "@/lib/format";
import { t } from "@/lib/i18n";
import { clearNotices, markAllRead, markToasted, type Notice, unreadCount, useNotifications } from "@/lib/notifications";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// The notification centre (lib/notifications.ts) as the sidebar's bell: a
// count of what is unread, and a list of what happened, newest first, each
// with a way back to what it is about. Opening it reads them all. NoticeToasts
// shows each new notice at once as a toast, with the same button. After
// Shipyard's (github.com/cosscom/shipyard, MIT).

const TOAST_TYPE = { success: "success", error: "error", warning: "warning", info: "info" } as const;

const go = (n: Notice) => n.action && useStore.getState().setView(n.action.view);

export function NotificationBell({ className }: { className?: string }) {
  const notices = useNotifications((s) => s.notices);
  const unread = unreadCount(notices);
  const [open, setOpen] = useState(false);
  const label = unread ? t("shell.notificationsUnread", { n: unread }) : t("shell.notifications");
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markAllRead();
      }}
    >
      <Tip label={label} side="right">
        <PopoverTrigger
          aria-label={label}
          data-testid="notifications"
          className={cn("relative inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground", className)}
        >
          <BellIcon className="size-3.5" />
          {unread > 0 && (
            <span
              aria-hidden
              data-testid="notifications-unread"
              // type-ok: a count tucked on the bell's corner, under the icon's own size
              className="absolute -end-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] text-primary-foreground tabular-nums leading-none"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </PopoverTrigger>
      </Tip>
      <PopoverPopup side="bottom" align="start" className="w-80 p-0" data-testid="notification-centre" aria-labelledby="notification-centre-title">
        <div className="flex h-bar items-center gap-2 border-b px-lane">
          <h2 id="notification-centre-title" className="flex-1 text-section text-foreground">
            {t("shell.notifications")}
          </h2>
          {notices.length > 0 && (
            <Button size="xs" variant="ghost" onClick={clearNotices}>
              {t("shell.notificationsClear")}
            </Button>
          )}
        </div>
        {notices.length === 0 ? (
          <p className="px-lane py-6 text-desc text-muted-foreground">{t("shell.notificationsEmpty")}</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {notices.map((n) => (
              <li key={n.id} className="flex flex-col gap-1 px-lane py-3" data-testid="notice">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-row">{n.title}</span>
                  <span className="shrink-0 text-meta text-muted-foreground">{ago(n.at)}</span>
                </div>
                {n.body && <p className="text-desc text-muted-foreground">{n.body}</p>}
                {n.action && (
                  <Button
                    size="xs"
                    variant="outline"
                    className="self-start"
                    onClick={() => {
                      go(n);
                      setOpen(false);
                    }}
                  >
                    {n.action.label}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverPopup>
    </Popover>
  );
}

// NoticeToasts shows each notice as it comes, as a toast with its button,
// once: a notice keeps that it was shown (lib/notifications.ts).
export function NoticeToasts() {
  const notices = useNotifications((s) => s.notices);
  useEffect(() => {
    const fresh = notices.filter((n) => !n.toasted).reverse();
    if (!fresh.length) return;
    for (const n of fresh)
      toastManager.add({
        title: n.title,
        description: n.body,
        type: TOAST_TYPE[n.tone],
        ...(n.action ? { actionProps: { children: n.action.label, onClick: () => go(n) } } : {}),
      });
    markToasted(fresh.map((n) => n.id));
  }, [notices]);
  return null;
}
