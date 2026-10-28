// Usage events: what people do, for the team that builds the app, sent only
// when the host has somewhere to send them (config.js's analyticsUrl) and
// the person signed in has said yes (Settings › General, prefs.shareUsageFor, off by
// default) and their browser doesn't ask not to (Global Privacy Control).
// EVENTS is the one table of what may be sent and with which properties, so
// nothing else (no names, no ids, no search words) leaves the device.
// Pure, so analytics.test.ts runs it in node; main.tsx starts it.

export const EVENTS = {
  // A view was opened, by its kind (lib/store.ts View).
  "view.open": ["kind"],
  // A record was made, by its kind.
  "record.create": ["kind"],
  // A record's status was changed, to which.
  "record.status": ["kind", "status"],
  // The command palette was opened.
  "palette.open": [],
  // How the page felt, as ratings only (lib/vitals.ts), and on which kind of view.
  "web.vitals": ["lcp", "cls", "inp", "kind"],
} as const satisfies Record<string, readonly string[]>;

export type EventName = keyof typeof EVENTS;
type Props<E extends EventName> = { [K in (typeof EVENTS)[E][number]]: string };

export interface UsageEvent {
  event: EventName;
  props: Record<string, string>;
  version: string;
  language: string;
}

let sink: ((e: Omit<UsageEvent, "version" | "language">) => void) | undefined;

// startAnalytics sends every tracked event to url through send, while allowed
// says yes (asked each time, so turning the setting off stops it at once).
export function startAnalytics(url: string, allowed: () => boolean, about: () => Omit<UsageEvent, "event" | "props">, send: (url: string, body: string) => boolean) {
  sink = (e) => {
    if (!allowed()) return;
    // Only the properties the table names, so a caller can't send more.
    const props = Object.fromEntries((EVENTS[e.event] as readonly string[]).filter((k) => k in e.props).map((k) => [k, e.props[k] ?? ""]));
    send(url, JSON.stringify({ ...e, props, ...about() } satisfies UsageEvent));
  };
}

export function stopAnalytics() {
  sink = undefined;
}

// track says something happened; nothing is sent unless startAnalytics ran
// and the person allows it.
export function track<E extends EventName>(event: E, ...props: (typeof EVENTS)[E] extends readonly [] ? [] : [Props<E>]) {
  sink?.({ event, props: (props[0] ?? {}) as Record<string, string> });
}

// mayShare is the browser's half of allowed: Global Privacy Control says no.
export const mayShare = (nav: unknown = globalThis.navigator): boolean => (nav as { globalPrivacyControl?: boolean } | undefined)?.globalPrivacyControl !== true;
