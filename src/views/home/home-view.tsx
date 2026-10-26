import { ArrowRightIcon, FolderKanbanIcon, KeyboardIcon, LayoutGridIcon, PaletteIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GettingStarted } from "@/components/getting-started";
import { openShortcuts } from "@/components/shortcuts-sheet";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { APP_NAME } from "@/lib/app";
import { flag } from "@/lib/flags";
import { t } from "@/lib/i18n";
import { openSettings, useStore } from "@/lib/store";
import { builtinThemes } from "@/themes/builtin";
import { ViewHeader } from "@/views/view-header";

// Home is the first view: a short tour of what the shell gives you, each
// card going to the thing it describes. Replace it with your own start page.
export function HomeView() {
  return (
    <div className="flex h-full flex-col">
      <ViewHeader title={t("shell.place.home")} description={t("shell.home.welcome", { app: APP_NAME })} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-page pt-8 pb-16">
          <h2 className="text-title">{t("shell.home.headline")}</h2>
          <p className="mt-2 max-w-prose text-muted-foreground text-body leading-relaxed">
            {t("shell.home.introBefore", { themes: builtinThemes.length })}
            <code className="rounded bg-muted px-1 py-px font-mono text-tag text-foreground">src/lib/api.ts</code>
            {t("shell.home.introAfter")}
          </p>
          {flag("gettingStarted") && <GettingStarted />}
          <div className="mt-8 grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
            <Card icon={<FolderKanbanIcon />} title={t("shell.place.projects")} description={t("shell.home.projects")} onClick={() => useStore.getState().setView({ kind: "projects" })} />
            <Card icon={<SearchIcon />} title={t("shell.home.search")} description={t("shell.home.searchText")} keys="⌘K" onClick={() => useStore.getState().setPaletteOpen(true)} />
            <Card icon={<PaletteIcon />} title={t("shell.home.themes")} description={t("shell.home.themesText")} onClick={() => openSettings("appearance")} />
            <Card icon={<KeyboardIcon />} title={t("shell.home.shortcuts")} description={t("shell.home.shortcutsText")} keys="⌘/" onClick={openShortcuts} />
            <Card icon={<LayoutGridIcon />} title={t("shell.place.kit")} description={t("shell.home.kitText")} onClick={() => useStore.getState().setView({ kind: "kit" })} />
          </div>
          <section className="mt-10">
            <h3 className="text-section text-muted-foreground">{t("shell.home.states")}</h3>
            <p className="mt-1 text-muted-foreground text-meta">{t("shell.home.statesText")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" render={<a href="?mock=1&slow=1" />}>
                {t("shell.home.slow")}
              </Button>
              <Button size="sm" variant="outline" render={<a href="?mock=1&fail=1" />}>
                {t("shell.home.down")}
              </Button>
              <Button size="sm" variant="outline" render={<a href="?mock=1&empty=1" />}>
                {t("shell.home.empty")}
              </Button>
              <Button size="sm" variant="outline" render={<a href="?mock=1&platform=linux" />}>
                {t("shell.home.linuxKeys")}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, description, keys, onClick }: { icon: ReactNode; title: string; description: string; keys?: string; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border bg-card/40 p-4 text-start outline-none transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-row">{title}</span>
          {keys && <Kbd>{keys}</Kbd>}
          <ArrowRightIcon className="ms-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="mt-1 block text-muted-foreground text-meta leading-relaxed">{description}</span>
      </span>
    </button>
  );
}
