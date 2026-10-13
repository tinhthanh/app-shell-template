import { ArrowRightIcon, FolderKanbanIcon, KeyboardIcon, PaletteIcon, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";

import { openShortcuts } from "@/components/shortcuts-sheet";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { APP_NAME } from "@/lib/app";
import { openSettings, useStore } from "@/lib/store";
import { ViewHeader } from "@/views/view-header";

// Home is the first view: a short tour of what the shell gives you, each
// card going to the thing it describes. Replace it with your own start page.
export function HomeView() {
  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Home" description={`Welcome to ${APP_NAME}`} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-8 pt-8 pb-16">
          <h2 className="font-semibold text-xl tracking-tight">A desktop-style app shell, no backend required</h2>
          <p className="mt-2 max-w-prose text-muted-foreground text-sm leading-relaxed">
            Sidebar, command palette, settings, 23 themes, keyboard shortcuts and a mock API, all wired. Views read data through one client (<code className="rounded bg-muted px-1 py-px font-mono text-[11px] text-foreground">src/lib/api.ts</code>) that runs on fixtures until you point it at a server.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
            <Card icon={<FolderKanbanIcon />} title="Projects" description="A list read from the API, with its loading, empty and failed states." onClick={() => useStore.getState().setView({ kind: "projects" })} />
            <Card icon={<SearchIcon />} title="Search and commands" description="Every place, command and theme in one list." keys="⌘K" onClick={() => useStore.getState().setPaletteOpen(true)} />
            <Card icon={<PaletteIcon />} title="Themes" description="Default Dark and Light, Midnight, Paper, and ports of popular editor themes, each checked for contrast." onClick={() => openSettings("appearance")} />
            <Card icon={<KeyboardIcon />} title="Keyboard shortcuts" description="One table drives the handler, the sheet and Settings." keys="⌘/" onClick={openShortcuts} />
          </div>
          <section className="mt-10">
            <h3 className="font-medium text-[13px] text-muted-foreground">Try the states</h3>
            <p className="mt-1 text-muted-foreground text-xs">The mock takes knobs in the URL, so each state is a link away.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" render={<a href="?mock=1&slow=1" />}>
                Slow network
              </Button>
              <Button size="sm" variant="outline" render={<a href="?mock=1&fail=1" />}>
                Server down
              </Button>
              <Button size="sm" variant="outline" render={<a href="?mock=1&empty=1" />}>
                Nothing yet
              </Button>
              <Button size="sm" variant="outline" render={<a href="?mock=1&platform=linux" />}>
                Linux keys
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
    <button type="button" onClick={onClick} className="group flex items-start gap-3 rounded-xl border bg-card/40 p-4 text-left outline-none transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          {keys && <Kbd>{keys}</Kbd>}
          <ArrowRightIcon className="ml-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="mt-1 block text-muted-foreground text-xs leading-relaxed">{description}</span>
      </span>
    </button>
  );
}
