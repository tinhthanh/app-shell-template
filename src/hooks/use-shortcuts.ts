import { useEffect } from "react";

import { toggleShortcuts } from "@/components/shortcuts-sheet";
import { announce } from "@/lib/announce";
import { t } from "@/lib/i18n";
import { type ShortcutId, shortcutFor } from "@/lib/keys";
import { places } from "@/lib/nav";
import { IS_MAC } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { assertNever, openSettings, useStore } from "@/lib/store";
import { zoom } from "@/lib/zoom";

// The app's shortcuts (lib/shortcuts.json) are caught on the window, before
// anything else sees them: lib/keys.ts says which one a press is, and run
// does it. A key that does nothing here goes on to the page, so a text
// field keeps its own.

// run does what the shortcut id does and says whether it did anything.
// arg is the place's number (place).
export function run(id: ShortcutId, arg?: number): boolean {
  const s = useStore.getState();
  switch (id) {
    case "palette":
      s.setPaletteOpen(!s.paletteOpen);
      return true;
    case "settings":
      openSettings();
      return true;
    case "sidebar": {
      const folded = !usePrefs.getState().sidebarCollapsed;
      setPrefs({ sidebarCollapsed: folded });
      // Out of sight of a screen reader: say what the key did.
      announce(folded ? t("shell.sidebarFolded") : t("shell.sidebarShown"));
      return true;
    }
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
      return assertNever(id);
  }
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const hit = shortcutFor(e, IS_MAC);
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
