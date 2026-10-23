import { Tip } from "@/components/tip";
import { useActiveTheme } from "@/hooks/use-theme";
import { isMock } from "@/lib/api";
import { APP_VERSION } from "@/lib/app";
import { t } from "@/lib/i18n";
import { openSettings } from "@/lib/store";

// StatusBar is the strip along the bottom: quiet facts about the app, each
// going somewhere when clicked. A real app puts its connection state, its
// counts and its background work here.
export function StatusBar() {
  const theme = useActiveTheme();
  return (
    <footer data-testid="status-bar" className="flex h-6.5 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t bg-sidebar px-3 text-tag text-muted-foreground">
      {isMock() && (
        <Tip label={t("shell.mockTip")}>
          <button type="button" className="rounded border border-warning/40 px-1 text-warning-foreground" aria-label={t("shell.mockLabel")} onClick={() => openSettings("about")}>
            mock
          </button>
        </Tip>
      )}
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
