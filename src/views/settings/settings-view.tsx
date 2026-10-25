import { ArrowLeftIcon, InfoIcon, KeyboardIcon, PaletteIcon, SlidersHorizontalIcon } from "lucide-react";
import { type ComponentType, useEffect } from "react";

import { usePhone } from "@/components/app-sidebar";
import { ink, inkScale } from "@/components/ink";
import { SimpleSelect } from "@/components/simple-select";
import { Kbd } from "@/components/ui/kbd";
import { type Key, t } from "@/lib/i18n";
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN } from "@/lib/sidebar-width";
import { closeSettings, openSettings, type SettingsSectionId, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AboutSection } from "@/views/settings/about-section";
import { AppearanceSection } from "@/views/settings/appearance-section";
import { GeneralSection } from "@/views/settings/general-section";
import { ShortcutsSection } from "@/views/settings/shortcuts-section";

export { openSettings, type SettingsSectionId };

// Settings' sections. Adding one: AGENTS.md › Adding things (an id in
// lib/store.ts, SECTIONS in lib/routes.ts and here, an axe scene).
// title is a key, not the word: this table is made once, as the module
// loads, and the word is looked up when it is drawn, in the language then.
interface Section {
  id: SettingsSectionId;
  title: Key;
  icon: ComponentType<{ className?: string }>;
  Component: ComponentType;
}

// General first: it is the section a bad address lands on.
const SECTIONS: readonly [Section, ...Section[]] = [
  { id: "general", title: "settings.section.general", icon: SlidersHorizontalIcon, Component: GeneralSection },
  { id: "appearance", title: "settings.section.appearance", icon: PaletteIcon, Component: AppearanceSection },
  { id: "shortcuts", title: "settings.section.shortcuts", icon: KeyboardIcon, Component: ShortcutsSection },
  { id: "about", title: "settings.section.about", icon: InfoIcon, Component: AboutSection },
];

// Settings is a page of its own. On a desktop its list takes the sidebar's
// place (App.tsx steps the sidebar and the status bar aside), as wide as the
// sidebar and drawn like it, with Back to app at the top: it and Esc go back
// to the view Settings was opened from. On a phone the bar stays, and a
// picker chooses the section. After Shipyard's (github.com/cosscom/shipyard, MIT).
export function SettingsView() {
  const view = useStore((s) => s.view);
  const id = (view.kind === "settings" && SECTIONS.some((s) => s.id === view.section) ? view.section : "general") as SettingsSectionId;
  const current = SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
  const phone = usePhone();

  // Esc goes back to the app, unless something on the page has it (a field,
  // a menu or a dialog).
  useEffect(() => {
    if (phone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      // Find a setting, once empty, lets its second Esc through (data-esc-leaves).
      const leaves = target instanceof HTMLInputElement && "escLeaves" in target.dataset && !target.value;
      if (!leaves && target?.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=menu], [role=listbox]")) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      closeSettings();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phone]);

  const page = (
    <div data-testid={`settings-${id}`} className="min-w-0 flex-1 overflow-y-auto">
      <current.Component key={id} />
    </div>
  );

  if (phone)
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-page py-2">
          <SimpleSelect
            aria-label={t("settings.sectionPicker")}
            className="w-full"
            value={id}
            options={SECTIONS.map((s) => ({ value: s.id, label: t(s.title) }))}
            onChange={(v) => v && openSettings(v as SettingsSectionId)}
          />
        </div>
        {page}
      </div>
    );

  return (
    <div className="flex h-full min-h-0">
      <nav
        aria-label={t("settings.sectionsNav")}
        style={{ width: `clamp(${SIDEBAR_MIN}px, var(--sidebar-w, ${SIDEBAR_DEFAULT}px), max(${SIDEBAR_DEFAULT}px, min(${SIDEBAR_MAX}px, 40vw)))` }}
        className={cn("flex shrink-0 flex-col border-sidebar-border border-e bg-sidebar text-sidebar-foreground", inkScale)}
      >
        <div className="flex h-bar shrink-0 items-center px-edge">
          <button type="button" onClick={closeSettings} data-testid="settings-back" className={cn(ROW, ink.quiet)}>
            <ArrowLeftIcon className="rtl:-scale-x-100" />
            <span className="flex-1">{t("settings.backToApp")}</span>
            <Kbd aria-hidden className="text-tag">
              esc
            </Kbd>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-edge pt-2 pb-2">
          {SECTIONS.filter((s) => s.id !== "about").map((s) => (
            <NavItem key={s.id} section={s} current={id} />
          ))}
          <div className="min-h-4 flex-1" />
          {SECTIONS.filter((s) => s.id === "about").map((s) => (
            <NavItem key={s.id} section={s} current={id} />
          ))}
        </div>
      </nav>
      {page}
    </div>
  );
}

// A row of the list, drawn as the sidebar's places are, in its ink
// (components/ink.ts).
const ROW = cn(
  "flex h-side-row w-full items-center gap-2 rounded-md px-2 text-start text-desc outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-(color:--ink-glyph)",
  ink.row,
);

function NavItem({ section: s, current }: { section: Section; current: SettingsSectionId }) {
  const active = s.id === current;
  return (
    <button
      type="button"
      onClick={() => openSettings(s.id)}
      data-testid={`settings-nav-${s.id}`}
      aria-current={active ? "page" : undefined}
      className={cn(ROW, active && "bg-sidebar-accent text-foreground [&>svg]:text-(color:--ink-row)")}
    >
      <s.icon />
      <span className="min-w-0 flex-1 truncate">{t(s.title)}</span>
    </button>
  );
}
