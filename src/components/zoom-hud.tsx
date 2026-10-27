import { ALargeSmallIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { platformKeys } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { UI_SIZES, useZoomHud } from "@/lib/zoom";

// ZoomHud shows the text size for a moment after ⌘+, ⌘− or ⌘0 (lib/zoom.ts):
// its size, and where that sits in the range. Its box is sized in px, not
// rem, so it holds still while everything behind it grows; its words are on
// the type scale.

const SHOW_MS = 1100;

export function ZoomHud() {
  const { size, at } = useZoomHud();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!at) return;
    setShown(true);
    const timer = window.setTimeout(() => setShown(false), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [at]);
  if (size === undefined) return null;
  const range = UI_SIZES;
  const steps = range.max - range.min + 1;
  const edge = size === range.max ? t("shell.zoom.largest") : size === range.min ? t("shell.zoom.smallest") : size === range.default ? t("shell.zoom.default") : undefined;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="zoom-hud"
      data-shown={shown || undefined}
      className={cn(
        "pointer-events-none fixed top-[64px] left-1/2 z-70 flex w-[244px] -translate-x-1/2 flex-col gap-[10px] rounded-lg border bg-popover px-3.5 pt-[12px] pb-[12px] text-popover-foreground shadow-xl/20",
        "opacity-0 transition-[opacity,translate] duration-200 ease-out -translate-y-[4px] data-shown:translate-y-0 data-shown:opacity-100",
      )}
    >
      <div className="flex items-center gap-[8px] text-desc leading-4">
        <ALargeSmallIcon className="size-[16px] shrink-0 text-muted-foreground" />
        <span className="font-medium">{t("shell.zoom.title")}</span>
        <span className="ms-auto font-mono text-meta text-muted-foreground tabular-nums">{size}px</span>
      </div>
      {/* One notch a step; the dot under one marks the default. */}
      <div className="flex items-start gap-[3px]" aria-hidden>
        {Array.from({ length: steps }, (_, i) => {
          const n = range.min + i;
          return (
            <span key={n} className="flex flex-1 flex-col items-center gap-[3px]">
              <span className={cn("h-[6px] w-full rounded-full transition-colors duration-150", n <= size ? "bg-foreground/80" : "bg-foreground/12")} />
              <span className={cn("size-[3px] rounded-full", n === range.default ? "bg-muted-foreground" : "bg-transparent")} />
            </span>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-tag text-muted-foreground leading-3.5">
        <span>{edge ?? t("shell.zoom.fromDefault", { sign: size > range.default ? "+" : "−", n: Math.abs(size - range.default) })}</span>
        <span>
          <kbd className="font-sans">{platformKeys("⌘0")}</kbd> {t("shell.zoom.resets")}
        </span>
      </div>
    </div>
  );
}
