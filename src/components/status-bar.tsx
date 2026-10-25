import { Tip } from "@/components/tip";
import { useActiveTheme } from "@/hooks/use-theme";
import { isMock } from "@/lib/api";
import { APP_VERSION } from "@/lib/app";
import { t } from "@/lib/i18n";
import { type StatusItem, useStatusItems } from "@/lib/status-items";
import { openSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

// StatusBar is the strip along the bottom: quiet facts about the app, each
// going somewhere when clicked. A real app puts its connection state, its
// counts and its background work here.
// What views put here (lib/status-items.ts, useStatusItem) sits along the
// start, after the mock chip, in its order.
const TONE = { default: "", warning: "border-warning/40 text-warning-foreground", error: "border-destructive/40 text-destructive-foreground", success: "border-success/40 text-success-foreground" };

export function StatusBar() {
  const theme = useActiveTheme();
  const items = useStatusItems((s) => s.items);
  return (
    <footer data-testid="status-bar" className="flex h-6.5 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t bg-sidebar px-3 text-tag text-muted-foreground">
      {isMock() && (
        <Tip label={t("shell.mockTip")}>
          <button type="button" className="rounded border border-warning/40 px-1 text-warning-foreground" aria-label={t("shell.mockLabel")} onClick={() => openSettings("about")}>
            mock
          </button>
        </Tip>
      )}
      {items.map((item) => (
        <StatusEntry key={item.id} item={item} />
      ))}
      <span className="ms-auto" />
      <button type="button" className="h-5 rounded px-1 hover:bg-accent hover:text-foreground" aria-label={t("shell.themeButton", { theme: theme.name })} onClick={() => openSettings("appearance")}>
        {theme.name}
      </button>
      <button type="button" className="h-5 rounded px-1 hover:bg-accent hover:text-foreground" aria-label={t("shell.versionButton", { version: APP_VERSION })} onClick={() => openSettings("about")}>
        v{APP_VERSION}
      </button>
    </footer>
  );
}

// StatusEntry is one item from a view (lib/status-items.ts): its words in its
// tone, a button when it goes somewhere, and its longer line as a tooltip.
function StatusEntry({ item }: { item: StatusItem }) {
  const body = (
    <span className={cn("rounded border border-transparent px-1", TONE[item.tone ?? "default"])} data-testid={`status-${item.id}`}>
      {item.label}
    </span>
  );
  const shown = item.onClick ? (
    <button type="button" className="h-5 rounded hover:bg-accent hover:text-foreground" onClick={item.onClick}>
      {body}
    </button>
  ) : (
    <span>{body}</span>
  );
  return item.tip ? <Tip label={item.tip}>{shown}</Tip> : shown;
}
