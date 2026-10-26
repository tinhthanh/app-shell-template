// The app open in several tabs behaves as one: signing out in one signs
// out every one (a shared machine left with a tab still signed in is the
// risk), signing in in one has the others that were showing the sign-in
// page look again, and a setting or a theme changed in one is that setting
// in all. Sessions travel over a BroadcastChannel; settings over the storage
// event, which a tab gets when another writes app.prefs or app.ui. main.tsx
// starts it; pure apart from the channel it is given, so tabs.test.ts runs
// it in node.
import { takeOtherTabsPrefs } from "./prefs.ts";
import { setTabsTeller } from "./session.ts";
import { takeOtherTabsUi } from "./store.ts";

export type TabMessage = { type: "signed-out" } | { type: "signed-in" };

export interface Channel {
  postMessage(message: TabMessage): void;
  addEventListener(type: "message", listener: (e: { data: unknown }) => void): void;
}

export interface StorageTarget {
  addEventListener(type: "storage", listener: (e: { key: string | null; newValue: string | null }) => void): void;
}

const isMessage = (m: unknown): m is TabMessage => typeof m === "object" && m !== null && ((m as TabMessage).type === "signed-out" || (m as TabMessage).type === "signed-in");

// startTabs listens to the other tabs: on("signed-out") signs this one out
// without telling the others back; on("signed-in") looks again at who is
// signed in. What this tab does is told to the rest through session.ts.
export function startTabs(channel: Channel | undefined, storage: StorageTarget | undefined, on: { signedOut(): void; signedIn(): void }) {
  if (channel) {
    setTabsTeller((m) => channel.postMessage(m));
    channel.addEventListener("message", (e) => {
      if (!isMessage(e.data)) return;
      if (e.data.type === "signed-out") on.signedOut();
      else on.signedIn();
    });
  }
  storage?.addEventListener("storage", (e) => {
    if (e.newValue === null) return;
    if (e.key === "app.prefs") takeOtherTabsPrefs(e.newValue);
    else if (e.key === "app.ui") takeOtherTabsUi(e.newValue);
  });
}
