import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { SearchField } from "@/components/search-field";
import { SimpleSelect } from "@/components/simple-select";
import { SYSTEM_THEME, useThemes } from "@/hooks/use-theme";
import { t } from "@/lib/i18n";
import { IS_LINUX } from "@/lib/platform";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";
import type { Theme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ownThemes } from "@/themes/builtin";
import { Segmented } from "@/views/settings/controls";
import { Code, fill, SettingsGroup, SettingsPage, SettingsRow } from "@/views/settings/rows";

const OWN = new Set(ownThemes.map((t) => t.id));

export function AppearanceSection() {
  const themes = useThemes();
  const themeId = useStore((s) => s.themeId);
  const density = usePrefs((p) => p.density);
  const uiFontSize = usePrefs((p) => p.uiFontSize);
  const [query, setQuery] = useState("");

  // The app's own, then every other theme by appearance; a search narrows
  // them by name.
  const q = query.trim().toLowerCase();
  const shown = q ? themes.filter((th) => th.name.toLowerCase().includes(q) || th.id.includes(q)) : themes;
  const groups = [
    { title: t("settings.appearance.builtIn"), themes: shown.filter((th) => OWN.has(th.id)) },
    { title: t("settings.appearance.dark"), themes: shown.filter((th) => !OWN.has(th.id) && th.appearance === "dark") },
    { title: t("settings.appearance.light"), themes: shown.filter((th) => !OWN.has(th.id) && th.appearance !== "dark") },
  ].filter((g) => g.themes.length);

  return (
    <SettingsPage title={t("settings.section.appearance")}>
      <section>
        <div className="mb-2 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-[0.8125rem] text-muted-foreground">{t("settings.appearance.theme")}</h2>
            <p className="mt-0.5 text-muted-foreground text-xs">{fill(t("settings.appearance.themeHint"), { file: <Code>src/themes/builtin.ts</Code>, command: <Code>pnpm check:themes</Code> })}</p>
          </div>
          <SearchField className="w-48 shrink-0" value={query} onChange={setQuery} placeholder={t("settings.appearance.findTheme")} />
        </div>
        {!q && <SystemCard selected={themeId === SYSTEM_THEME} themes={themes} />}
        {groups.map((g) => (
          <div key={g.title} className="mt-4">
            <h3 className="mb-2 font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wide">{g.title}</h3>
            <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1">
              {g.themes.map((th) => (
                <ThemeCard key={th.id} theme={th} selected={th.id === themeId} onSelect={() => useStore.getState().setTheme(th.id)} />
              ))}
            </div>
          </div>
        ))}
        {!groups.length && <p className="mt-4 text-muted-foreground text-xs">{t("settings.appearance.noTheme", { query: query.trim() })}</p>}
      </section>

      <SettingsGroup title={t("settings.appearance.interface")}>
        <SettingsRow label={t("settings.appearance.textSize")} description={t("settings.appearance.textSizeDescription")}>
          <Segmented
            value={String(uiFontSize)}
            options={[
              { value: "12", label: t("settings.appearance.small") },
              { value: "13", label: t("settings.appearance.default") },
              { value: "14", label: t("settings.appearance.large") },
              // A size zoomed to (⌘+, ⌘−) that none of these is.
              ...(uiFontSize < 12 || uiFontSize > 14 ? [{ value: String(uiFontSize), label: t("settings.appearance.px", { n: uiFontSize }) }] : []),
            ]}
            onChange={(v) => setPrefs({ uiFontSize: Number(v) })}
          />
        </SettingsRow>
        <SettingsRow label={t("settings.appearance.density")} description={t("settings.appearance.densityDescription")}>
          <Segmented
            value={density}
            options={[
              { value: "compact", label: t("settings.appearance.compact") },
              { value: "comfortable", label: t("settings.appearance.comfortable") },
            ]}
            onChange={(density) => setPrefs({ density })}
          />
        </SettingsRow>
      </SettingsGroup>
    </SettingsPage>
  );
}

// SystemCard follows the computer's appearance: one theme by day, another
// when the OS is dark. Its preview is half of each.
function SystemCard({ selected, themes }: { selected: boolean; themes: Theme[] }) {
  const picks = usePrefs((p) => p.systemThemes);
  const light = themes.find((th) => th.id === picks.light) ?? themes.find((th) => th.id === "default-light");
  const dark = themes.find((th) => th.id === picks.dark) ?? themes.find((th) => th.id === "default-dark");
  if (!light || !dark) return null;
  const pick = (side: "light" | "dark", id: string) => {
    setPrefs({ systemThemes: { ...picks, [side]: id } });
    useStore.getState().setTheme(SYSTEM_THEME);
  };
  const options = (appearance: "light" | "dark") => themes.filter((th) => (th.appearance === "dark") === (appearance === "dark")).map((th) => ({ value: th.id, label: th.name }));
  return (
    <div className={cn("flex flex-wrap items-center overflow-hidden rounded-xl border transition-[box-shadow,border-color]", selected ? "border-eing ring-1 ring-ring" : "hover:border-foreground/25")}>
      <button
        type="button"
        onClick={() => useStore.getState().setTheme(SYSTEM_THEME)}
        aria-pressed={selected}
        data-testid="theme-option"
        data-theme-id={SYSTEM_THEME}
        className="flex min-w-0 flex-1 items-center self-stretch text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="relative h-14 w-28 shrink-0 border-e">
          <Swatch theme={light} />
          <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
            <Swatch theme={dark} />
          </div>
        </div>
        <span className="flex min-w-0 flex-1 items-center gap-2 px-3.5 text-[0.8125rem]">
          <span className="min-w-0 flex-1">
            <span className="block">{t("settings.matchSystem")}</span>
            <span className="block truncate text-[0.6875rem] text-muted-foreground">{IS_LINUX ? t("settings.appearance.followsDesktop") : t("settings.appearance.followsMacos")}</span>
          </span>
          {selected && <CheckIcon className="size-3.5" />}
        </span>
      </button>
      {/* On a narrow card (a small window, a big text size) the pickers take a row of their own. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 max-[900px]:basis-full max-[900px]:border-t">
        <SimpleSelect size="sm" className="w-40" aria-label={t("settings.appearance.themeByDay")} value={light.id} options={options("light")} onChange={(id) => id && pick("light", id)} />
        <SimpleSelect size="sm" className="w-40" aria-label={t("settings.appearance.themeWhenDark")} value={dark.id} options={options("dark")} onChange={(id) => id && pick("dark", id)} />
      </div>
    </div>
  );
}

// ThemeCard previews a theme with its own colors: a sidebar beside a code
// panel, whatever theme the app itself is in.
function ThemeCard({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect(): void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid="theme-option"
      data-theme-id={theme.id}
      className={cn(
        "group overflow-hidden rounded-xl border text-start outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-eing ring-1 ring-ring" : "hover:border-foreground/25",
      )}
    >
      {/* A picture of the theme (its name says which): its sample text is in
          the theme's own colours, which the axe spec leaves out. */}
      <div aria-hidden data-a11y-skip className="relative h-[88px]">
        <Preview theme={theme} />
        <Dots theme={theme} />
      </div>
      <div className="flex items-center gap-2 border-t bg-card px-3 py-2 text-[0.8125rem]">
        <span className="min-w-0 flex-1 truncate">{theme.name}</span>
        {selected && <CheckIcon className="size-3.5 shrink-0" />}
      </div>
    </button>
  );
}

// Preview draws a theme's sidebar beside a code panel, in its own colors.
function Preview({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const t = theme.terminal;
  return (
    // A picture of the theme, hidden from a screen reader where it is used; said here too, so check:words knows.
    <div aria-hidden className="flex h-full" style={{ background: c.background }}>
      <div className="flex w-[38%] flex-col gap-1.5 border-e px-2.5 py-3" style={{ background: c.sidebar, borderColor: c.border }}>
        <div className="h-1.5 w-4/5 rounded-full" style={{ background: c.sidebarForeground, opacity: 0.55 }} />
        <div className="h-1.5 w-3/5 rounded-full" style={{ background: c.sidebarForeground, opacity: 0.3 }} />
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full" style={{ background: c.warning }} />
          <div className="h-1.5 flex-1 rounded-full" style={{ background: c.accent }} />
        </div>
        <div className="h-1.5 w-2/3 rounded-full" style={{ background: c.sidebarForeground, opacity: 0.3 }} />
      </div>
      <div className="flex-1 px-2.5 py-2.5 font-mono text-[0.625rem] leading-[1.5]" style={{ background: t.background, color: t.foreground }}>
        <div>
          <Dot color={t.green} /> tests pass
        </div>
        <div>
          <Dot color={t.yellow} /> <span style={{ color: t.blue }}>~/work/shop</span>
        </div>
        <div>
          <ChevronRightIcon aria-hidden className="inline size-2.5 align-[-0.1em]" style={{ color: t.magenta }} strokeWidth={3} /> <span style={{ color: t.cyan }}>build</span>
          <span className="ms-0.5 inline-block h-2.5 w-1 align-middle" style={{ background: t.cursor }} />
        </div>
      </div>
    </div>
  );
}

// Swatch is a theme's colours without text, for a thumbnail too small to
// read: sidebar, panel, and an accent and a cursor.
function Swatch({ theme }: { theme: Theme }) {
  const c = theme.colors;
  const t = theme.terminal;
  return (
    <div className="flex h-full">
      <div className="flex w-2/5 flex-col gap-1 px-1.5 py-2" style={{ background: c.sidebar }}>
        <div className="h-1 w-4/5 rounded-full" style={{ background: c.sidebarForeground, opacity: 0.5 }} />
        <div className="h-1 w-3/5 rounded-full" style={{ background: c.accent }} />
      </div>
      <div className="flex-1 px-1.5 py-2" style={{ background: t.background }}>
        <div className="h-1 w-3/4 rounded-full" style={{ background: t.green }} />
        <div className="mt-1 h-1.5 w-1 rounded-[1px]" style={{ background: t.cursor }} />
      </div>
    </div>
  );
}

// Dots are a theme's colours at a glance, in the corner of its preview: its
// primary, then red, yellow, green, blue and magenta.
function Dots({ theme }: { theme: Theme }) {
  const t = theme.terminal;
  return (
    <span className="absolute end-2 bottom-2 flex items-center gap-[3px] rounded-full border px-1.5 py-1" style={{ background: theme.colors.background, borderColor: theme.colors.border }} aria-hidden>
      {[theme.colors.primary, t.red, t.yellow, t.green, t.blue, t.magenta].map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: six fixed dots.
        <span key={i} className="size-2 rounded-full" style={{ background: c }} />
      ))}
    </span>
  );
}

// Dot is the preview's status light, drawn rather than typed: a ● glyph
// comes from whatever font the machine has, in whatever size.
function Dot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-1.5 rounded-full align-[-0.05em]" style={{ background: color }} />;
}
