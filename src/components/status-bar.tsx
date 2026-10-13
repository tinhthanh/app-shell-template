import { Tip } from "@/components/tip";
import { useActiveTheme } from "@/hooks/use-theme";
import { isMock } from "@/lib/api";
import { APP_VERSION } from "@/lib/app";
import { openSettings } from "@/lib/store";

// StatusBar is the strip along the bottom: quiet facts about the app, each
// going somewhere when clicked. A real app puts its connection state, its
// counts and its background work here.
export function StatusBar() {
  const theme = useActiveTheme();
  return (
    <footer data-testid="status-bar" className="flex h-6.5 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t bg-sidebar px-3 text-[11px] text-muted-foreground">
      {isMock() && (
        <Tip label="Showing made-up data (?mock=1, or no VITE_API_URL)">
          <span className="rounded border border-warning/40 px-1 text-warning-foreground">mock</span>
        </Tip>
      )}
      <span className="ml-auto" />
      <button type="button" className="rounded px-1 hover:bg-accent hover:text-foreground" onClick={() => openSettings("appearance")}>
        {theme.name}
      </button>
      <button type="button" className="rounded px-1 hover:bg-accent hover:text-foreground" onClick={() => openSettings("about")}>
        v{APP_VERSION}
      </button>
    </footer>
  );
}
