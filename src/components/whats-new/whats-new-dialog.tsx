import { SparklesIcon } from "lucide-react";
import { useEffect } from "react";
import { create } from "zustand";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { APP_VERSION } from "@/lib/app";
import { t } from "@/lib/i18n";
import { firstRun, setPrefs, usePrefs } from "@/lib/prefs";
import { type ChangelogEntry, decide, latestRelease } from "@/lib/whats-new";
import { WHATS_NEW } from "@/lib/whats-new-notes";

// What's new shows a release's notes: once after an update (lib/whats-new.ts
// decides, against prefs.whatsNewSeen), and whenever asked from the palette
// or Settings › About (openWhatsNew). App.tsx mounts it once. The frame is
// in the language in use; the notes are the changelog's, as written.

const useWhatsNew = create<{ release?: ChangelogEntry }>()(() => ({}));

export function openWhatsNew() {
  useWhatsNew.setState({ release: latestRelease(WHATS_NEW) });
}

// useWhatsNewAfterUpdate shows the dialog once after an update, and keeps
// the version seen either way.
export function useWhatsNewAfterUpdate() {
  const seen = usePrefs((p) => p.whatsNewSeen);
  // Decided once, as the app starts, not on every change of seen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: decided once as the app starts, not again when seen changes.
  useEffect(() => {
    const d = decide({ firstRun, seen, current: APP_VERSION, releases: WHATS_NEW });
    if (d.seen !== seen) setPrefs({ whatsNewSeen: d.seen });
    if (d.show) useWhatsNew.setState({ release: d.show });
  }, []);
}

export function WhatsNewDialog() {
  const release = useWhatsNew((s) => s.release);
  return (
    <Dialog open={!!release} onOpenChange={(o) => !o && useWhatsNew.setState({ release: undefined })}>
      {release && (
        <DialogPopup data-testid="whats-new">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-muted-foreground" />
              {t("settings.whatsNew.title", { version: release.version })}
            </DialogTitle>
            <DialogDescription>{t("settings.whatsNew.description")}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ul className="flex flex-col gap-2 text-body">
              {release.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button />}>{t("settings.whatsNew.gotIt")}</DialogClose>
          </DialogFooter>
        </DialogPopup>
      )}
    </Dialog>
  );
}
