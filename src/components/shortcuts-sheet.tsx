import { useRef } from "react";
import { create } from "zustand";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { ZoomHud } from "@/components/zoom-hud";
import { t } from "@/lib/i18n";
import { groupName, SHORTCUT_GROUPS, SHORTCUTS, shortcutName } from "@/lib/shortcuts";
import { openSettings } from "@/lib/store";

// The Keyboard shortcuts sheet (⌘/, or from the palette): every shortcut,
// grouped, from the same table as Settings › Shortcuts (lib/shortcuts.json).

const useShortcutsSheet = create<{ open: boolean }>()(() => ({ open: false }));
export const toggleShortcuts = () => useShortcutsSheet.setState((s) => ({ open: !s.open }));
export const openShortcuts = () => useShortcutsSheet.setState({ open: true });

export function ShortcutsSheet() {
  const open = useShortcutsSheet((s) => s.open);
  const done = useRef<HTMLButtonElement>(null);
  const close = () => useShortcutsSheet.setState({ open: false });
  return (
    <Sheet open={open} onOpenChange={(o) => useShortcutsSheet.setState({ open: o })}>
      {/* The zoom HUD (⌘+, ⌘−, ⌘0) lives with the sheet that lists those keys. */}
      <ZoomHud />
      {/* The keyboard starts on Done: the other button leaves for Settings. */}
      <SheetPopup className="sm:max-w-sm" initialFocus={done}>
        <SheetHeader>
          <SheetTitle>{t("settings.sheet.title")}</SheetTitle>
          <SheetDescription>{t("settings.shortcuts.description")}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group} aria-label={groupName(group)}>
              <h3 className="mb-1 text-label text-muted-foreground">{groupName(group)}</h3>
              <ul className="flex flex-col">
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <li key={s.id} className="flex min-h-side-row items-center gap-2 border-b border-dashed py-0.5 text-body last:border-b-0">
                    <span className="min-w-0 flex-1 truncate">{shortcutName(s)}</span>
                    <Kbd className="text-foreground/80">{s.keys}</Kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </SheetPanel>
        <SheetFooter>
          <Button
            variant="ghost"
            onClick={() => {
              close();
              openSettings("shortcuts");
            }}
          >
            {t("settings.sheet.searchInSettings")}
          </Button>
          <Button ref={done} onClick={close}>
            {t("settings.sheet.done")}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
