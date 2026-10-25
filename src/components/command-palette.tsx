import { KeyboardIcon, PaletteIcon, PanelLeftIcon, SparklesIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

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
import { openWhatsNew } from "@/components/whats-new/whats-new-dialog";
import { useThemes } from "@/hooks/use-theme";
import { client } from "@/lib/api";
import { t } from "@/lib/i18n";
import { places, RECORD_KINDS } from "@/lib/nav";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { keysFor } from "@/lib/shortcuts";
import { paletteOpenedFrom, useStore } from "@/lib/store";
import type { SearchHit } from "@/lib/types";

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
  // The records that match what was typed (client.search), a moment after
  // the typing pauses; an answer to an older query is dropped.
  const [hits, setHits] = useState<SearchHit[]>([]);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      client.search(q).then(
        (h) => live && setHits(h),
        () => live && setHits([]),
      );
    }, 150);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query]);
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
        label: collapsed ? t("shell.showSidebar") : t("shell.hideSidebar"),
        icon: <PanelLeftIcon />,
        shortcut: keysFor("sidebar"),
        run: () => setPrefs({ sidebarCollapsed: !collapsed }),
      },
      { value: "cmd:shortcuts", label: t("shell.palette.keyboardShortcuts"), icon: <KeyboardIcon />, shortcut: keysFor("shortcuts"), run: openShortcuts },
      { value: "cmd:whats-new", label: t("shell.palette.whatsNew"), icon: <SparklesIcon />, search: "release version changelog", run: openWhatsNew },
    ];
    // Each kind of record is a group of its own (lib/nav.tsx RECORD_KINDS).
    const records: Group[] = Object.entries(RECORD_KINDS)
      .map(([kind, k]) => ({
        value: t(k.group),
        items: hits
          .filter((h) => h.kind === kind)
          .map((h): Item => ({ value: `record:${h.kind}:${h.id}`, label: h.name, icon: k.icon, detail: h.detail, run: () => useStore.getState().setView(k.view(h.id)) })),
      }))
      .filter((g) => g.items.length);
    const themeItems: Item[] = themes.map((th) => ({
      value: `theme:${th.id}`,
      label: th.name,
      icon: <PaletteIcon />,
      detail: th.id === themeId ? t("shell.palette.current") : t(`shell.palette.${th.appearance}`),
      search: `theme ${th.appearance}`,
      theme: th.id,
      run: () => useStore.getState().setTheme(th.id),
    }));
    return [...records, { value: t("shell.palette.goTo"), items: goTo }, { value: t("shell.palette.commands"), items: commands }, { value: t("shell.palette.themes"), items: themeItems }];
  }, [themes, themeId, collapsed, hits]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setOpen(true);
        else close();
      }}
    >
      {/* Closed, the keyboard goes back to the button or key that opened it, else home. */}
      <CommandDialogPopup aria-label={t("shell.home.search")} data-testid="command-palette" finalFocus={() => (paletteOpenedFrom()?.isConnected ? (paletteOpenedFrom() as HTMLElement) : true)}>
        <Command
          items={groups}
          value={query}
          onValueChange={setQuery}
          itemToStringValue={(i: unknown) => `${(i as Item).label} ${(i as Item).detail ?? ""} ${(i as Item).search ?? ""}`}
          // The server already matched the records (by their description, an
          // owner…): they stay as it ranked them; places, commands and themes
          // are matched here, by their words.
          filter={(i: unknown, q: string) =>
            (i as Item).value.startsWith("record:") || `${(i as Item).label} ${(i as Item).detail ?? ""} ${(i as Item).search ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
          }
          onItemHighlighted={(i: unknown) => {
            // A highlight that lands while the popup animates out is not a preview.
            const picked = (i as Item | undefined)?.theme;
            if (!picked || !useStore.getState().paletteOpen) return;
            before.current ??= useStore.getState().themeId;
            useStore.getState().setTheme(picked);
          }}
        >
          <CommandInput aria-label={t("shell.palette.label")} placeholder={t("shell.palette.placeholder")} />
          <CommandPanel>
            <CommandEmpty>{t("shell.palette.nothing")}</CommandEmpty>
            <CommandList>
              {(group: Group) => (
                <CommandGroup key={group.value} items={group.items}>
                  <CommandGroupLabel>{group.value}</CommandGroupLabel>
                  <CommandCollection>
                    {(item: Item) => (
                      <CommandItem key={item.value} value={item} className="gap-2" onClick={() => pick(item.run)}>
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                        {item.detail && <span className="ms-auto min-w-0 shrink truncate text-muted-foreground text-meta">{item.detail}</span>}
                        {item.shortcut && <Kbd className={item.detail ? "" : "ms-auto"}>{item.shortcut}</Kbd>}
                      </CommandItem>
                    )}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter className="text-tag text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> {t("shell.palette.toMove")} <Kbd>↵</Kbd> {t("shell.palette.toOpen")}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> {t("shell.palette.toClose")}
            </span>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
