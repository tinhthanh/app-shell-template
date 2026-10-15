import { KeyboardIcon, PaletteIcon, PanelLeftIcon } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";

import { openShortcuts } from "@/components/shortcuts-sheet";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useThemes } from "@/hooks/use-theme";
import { places } from "@/lib/nav";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { keysFor } from "@/lib/shortcuts";
import { paletteOpenedFrom, useStore } from "@/lib/store";

// The command palette (⌘K): the app's places, its commands and its themes,
// in one searchable list. Highlighting a theme previews it; closing without
// choosing puts the old one back.

interface Item {
  value: string;
  label: string;
  icon?: ReactNode;
  detail?: string;
  shortcut?: string;
  // Extra words a search finds it by.
  search?: string;
  theme?: string;
  run(): void;
}

interface Group {
  value: string;
  items: Item[];
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const themes = useThemes();
  const themeId = useStore((s) => s.themeId);
  const collapsed = usePrefs((p) => p.sidebarCollapsed);
  const [query, setQuery] = useState("");
  // The theme before a preview, to put back on close.
  const before = useRef<string>(undefined);

  // close puts a previewed theme back unless one was chosen, and clears the
  // search in the same render, so the closing frames list afresh.
  const close = (chosen = false) => {
    if (!chosen && before.current !== undefined && useStore.getState().themeId !== before.current) useStore.getState().setTheme(before.current);
    before.current = undefined;
    setQuery("");
    setOpen(false);
  };
  const pick = (run: () => void) => {
    close(true);
    run();
  };

  const groups = useMemo<Group[]>(() => {
    const goTo: Item[] = places().map((p, i) => ({
      value: `place:${p.id}`,
      label: p.label,
      icon: p.icon,
      shortcut: p.footer ? keysFor("settings") : `⌘${i + 1}`,
      run: () => useStore.getState().setView({ ...p.view }),
    }));
    const commands: Item[] = [
      {
        value: "cmd:sidebar",
        label: collapsed ? "Show the sidebar" : "Hide the sidebar",
        icon: <PanelLeftIcon />,
        shortcut: keysFor("sidebar"),
        run: () => setPrefs({ sidebarCollapsed: !collapsed }),
      },
      { value: "cmd:shortcuts", label: "Keyboard shortcuts", icon: <KeyboardIcon />, shortcut: keysFor("shortcuts"), run: openShortcuts },
    ];
    const themeItems: Item[] = themes.map((t) => ({
      value: `theme:${t.id}`,
      label: t.name,
      icon: <PaletteIcon />,
      detail: t.id === themeId ? "current" : t.appearance,
      search: `theme ${t.appearance}`,
      theme: t.id,
      run: () => useStore.getState().setTheme(t.id),
    }));
    return [
      { value: "Go to", items: goTo },
      { value: "Commands", items: commands },
      { value: "Themes", items: themeItems },
    ];
  }, [themes, themeId, collapsed]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setOpen(true);
        else close();
      }}
    >
      {/* Closed, the keyboard goes back to the button or key that opened it, else home. */}
      <CommandDialogPopup aria-label="Search and commands" data-testid="command-palette" finalFocus={() => (paletteOpenedFrom()?.isConnected ? (paletteOpenedFrom() as HTMLElement) : true)}>
        <Command
          items={groups}
          value={query}
          onValueChange={setQuery}
          itemToStringValue={(i: unknown) => `${(i as Item).label} ${(i as Item).detail ?? ""} ${(i as Item).search ?? ""}`}
          onItemHighlighted={(i: unknown) => {
            // A highlight that lands while the popup animates out is not a preview.
            const t = (i as Item | undefined)?.theme;
            if (!t || !useStore.getState().paletteOpen) return;
            before.current ??= useStore.getState().themeId;
            useStore.getState().setTheme(t);
          }}
        >
          <CommandInput aria-label="Search places, commands and themes" placeholder="Go to a place, run a command, pick a theme…" />
          <CommandPanel>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandList>
              {(group: Group) => (
                <CommandGroup key={group.value} items={group.items}>
                  <CommandGroupLabel>{group.value}</CommandGroupLabel>
                  <CommandCollection>
                    {(item: Item) => (
                      <CommandItem key={item.value} value={item} className="gap-2" onClick={() => pick(item.run)}>
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                        {item.detail && <span className="ml-auto min-w-0 shrink truncate text-muted-foreground text-xs">{item.detail}</span>}
                        {item.shortcut && <Kbd className={item.detail ? "" : "ml-auto"}>{item.shortcut}</Kbd>}
                      </CommandItem>
                    )}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter className="text-[0.6875rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to move, <Kbd>↵</Kbd> to open
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> to close
            </span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
