import { create } from "zustand";

// What a screen reader should hear when something changes out of sight:
// the sidebar folded by a key, a background job that finished. Toasts are
// heard already (Base UI's viewport is a live region; urgent ones are
// alerts); this is for the rest. Two regions, in components/announcer.tsx:
// polite waits for a pause, assertive doesn't.

interface Said {
  polite: string;
  assertive: string;
}

export const useAnnouncer = create<Said>()(() => ({ polite: "", assertive: "" }));

let timer = 0;

// announce says text once. The same words twice in a row are said twice:
// the region is emptied first, so the reader hears a change.
export function announce(text: string, urgent = false) {
  const key = urgent ? "assertive" : "polite";
  useAnnouncer.setState({ [key]: "" } as Partial<Said>);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => useAnnouncer.setState({ [key]: text } as Partial<Said>), 60);
}
