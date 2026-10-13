import { useEffect } from "react";

import { toggleShortcuts } from "@/components/shortcuts-sheet";
import { places } from "@/lib/nav";
import { modKey } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { openSettings, useStore } from "@/lib/store";
import { zoom } from "@/lib/zoom";

// The app's shortcuts (lib/shortcuts.json) are caught on the window, before
// anything else sees them, and end up in run. A key that does nothing here
// goes on to the page, so a text field keeps its own.

// run does what the shortcut id does and says whether it did anything.
// arg is the place's number (place).
export function run(id: string, arg?: number): boolean {
  const s = useStore.getState();
  switch (id) {
    case "palette":
      s.setPaletteOpen(!s.paletteOpen);
      return true;
    case "settings":
      openSettings();
      return true;
    case "sidebar":
      setPrefs({ sidebarCollapsed: !usePrefs.getState().sidebarCollapsed });
      return true;
    case "shortcuts":
      toggleShortcuts();
      return true;
    case "zoom-in":
    case "zoom-out":
    case "zoom-reset":
      zoom(id === "zoom-in" ? 1 : id === "zoom-out" ? -1 : 0);
      return true;
    case "place": {
      const place = places()[Number(arg) - 1];
      if (!place) return false;
      s.setView(place.view);
      return true;
    }
    default:
      return false;
  }
}

// The keys, as KeyboardEvent reports them, to the ids in shortcuts.json.
// Add a line here when you add a shortcut there.
function idOf(e: KeyboardEvent): { id: string; arg?: number } | undefined {
  if (!modKey(e) || e.altKey) return undefined;
  const k = e.key;
  if (e.shiftKey) return undefined;
  if (k === "k") return { id: "palette" };
  if (k === ",") return { id: "settings" };
  if (k === "\\") return { id: "sidebar" };
  if (k === "/") return { id: "shortcuts" };
  if (k === "=" || k === "+") return { id: "zoom-in" };
  if (k === "-") return { id: "zoom-out" };
  if (k === "0") return { id: "zoom-reset" };
  if (/^[1-9]$/.test(k)) return { id: "place", arg: Number(k) };
  return undefined;
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const hit = idOf(e);
      if (!hit) return;
      if (run(hit.id, hit.arg)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
}
