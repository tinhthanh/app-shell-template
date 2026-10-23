import { InfoIcon, KeyboardIcon, PaletteIcon, SlidersHorizontalIcon } from "lucide-react";
import type { ComponentType } from "react";

import { usePhone } from "@/components/app-sidebar";
import { ink, inkScale } from "@/components/ink";
import { SimpleSelect } from "@/components/simple-select";
import { Tip } from "@/components/tip";
import { type Key, t } from "@/lib/i18n";
import { openSettings, type SettingsSectionId, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AboutSection } from "@/views/settings/about-section";
import { AppearanceSection } from "@/views/settings/appearance-section";
import { GeneralSection } from "@/views/settings/general-section";
import { ShortcutsSection } from "@/views/settings/shortcuts-section";
import { ViewHeaderHost } from "@/views/view-header";

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

// Below 1200px of window the section list shrinks to its icons, so the
// settings themselves keep their width.
export function SettingsView() {
  const view = useStore((s) => s.view);
  const id = (view.kind === "settings" && SECTIONS.some((s) => s.id === view.section) ? view.section : "general") as SettingsSectionId;
  const current = SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
  const phone = usePhone();

  return (
    <div className="flex h-full flex-col">
      <ViewHeaderHost fallback={{ title: t("settings.title") }}>
        <div className={cn("flex min-h-0 flex-1", phone && "flex-col")}>
          {phone ? (
            <div className="border-b px-4 py-2">
              <SimpleSelect
                aria-label={t("settings.sectionPicker")}
                className="w-full"
                value={id}
                options={SECTIONS.map((s) => ({ value: s.id, label: t(s.title) }))}
                onChange={(v) => v && openSettings(v as SettingsSectionId)}
              />
            </div>
          ) : (
            <nav aria-label={t("settings.sectionsNav")} className={cn("flex w-48 shrink-0 flex-col gap-px border-e px-2 pt-4 max-[1200px]:w-12 max-[1200px]:px-1.5", inkScale)}>
              {SECTIONS.map((s) => (
                <div key={s.id}>
                  {s.id === "about" && <div className="mx-2.5 my-2 border-t max-[1200px]:mx-1" />}
                  {/* The tooltip is for the narrow window, where only icons show. */}
                  <Tip label={t(s.title)} side="right" className="min-[1201px]:hidden">
                    <button
                      type="button"
                      onClick={() => openSettings(s.id)}
                      data-testid={`settings-nav-${s.id}`}
                      aria-current={s.id === id ? "page" : undefined}
                      aria-label={t(s.title)}
                      className={cn(
                        "flex h-7.5 w-full items-center gap-2.5 rounded-md px-2.5 text-start text-desc transition-colors max-[1200px]:justify-center max-[1200px]:px-0",
                        s.id === id ? cn("bg-accent", ink.strong) : cn(ink.row, "hover:bg-accent/50 hover:text-foreground"),
                      )}
                    >
                      <s.icon className={cn("size-3.5 shrink-0", s.id === id ? "text-(color:--ink-row)" : ink.glyph)} />
                      <span className="max-[1200px]:hidden">{t(s.title)}</span>
                    </button>
                  </Tip>
                </div>
              ))}
            </nav>
          )}
          <div data-testid={`settings-${id}`} className="min-w-0 flex-1 overflow-y-auto">
            <current.Component key={id} />
          </div>
        </div>
      </ViewHeaderHost>
    </div>
  );
}
