import { create } from "zustand";

import { onSignedOut } from "./session.ts";
import type { View } from "./store.ts";

// What happened while you weren't looking, kept for the page's life: notify
// adds a notice, which shows at once as a toast (components/notices.tsx) and
// stays in the sidebar's notification centre until cleared, with a way back
// to what it is about. The newest come first; only the last MAX_NOTICES are
// kept. After Shipyard's (github.com/cosscom/shipyard, MIT). Pure, so
// notifications.test.ts runs it in node.

export interface Notice {
  id: string;
  title: string;
  body?: string;
  tone: "info" | "success" | "warning" | "error";
  // ISO 8601, for the centre's "2 minutes ago".
  at: string;
  read: boolean;
  // Shown as a toast already (components/notices.tsx), so a remount doesn't show it again.
  toasted?: boolean;
  // Where its button goes: a record, a list.
  action?: { label: string; view: View };
}

export const MAX_NOTICES = 50;

export const useNotifications = create<{ notices: Notice[] }>()(() => ({ notices: [] }));

let next = 0;

// notify keeps a notice, unread, and says its id.
export function notify(n: Omit<Notice, "id" | "at" | "read" | "tone"> & { tone?: Notice["tone"] }): string {
  const id = `n${++next}`;
  const notice: Notice = { tone: "info", ...n, id, at: new Date().toISOString(), read: false };
  useNotifications.setState((s) => ({ notices: [notice, ...s.notices].slice(0, MAX_NOTICES) }));
  return id;
}

export const unreadCount = (notices: Notice[]) => notices.filter((n) => !n.read).length;

// markAllRead is opening the centre: what was in it has been seen.
export function markAllRead() {
  useNotifications.setState((s) => ({ notices: s.notices.map((n) => (n.read ? n : { ...n, read: true })) }));
}

export function clearNotices() {
  useNotifications.setState({ notices: [] });
}

// markToasted records that these were shown as toasts.
export function markToasted(ids: string[]) {
  const shown = new Set(ids);
  useNotifications.setState((s) => ({ notices: s.notices.map((n) => (shown.has(n.id) ? { ...n, toasted: true } : n)) }));
}

// The next person to sign in sees none of these.
onSignedOut(clearNotices);
