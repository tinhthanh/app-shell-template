import { SparklesIcon } from "lucide-react";
import { useEffect } from "react";
import { create } from "zustand";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { APP_VERSION } from "@/lib/app";
import { firstRun, setPrefs, usePrefs } from "@/lib/prefs";
import { RELEASES } from "@/lib/releases";
import { decide, latestRelease, type Release } from "@/lib/whats-new";

// What's new shows a release's notes: once after an update (lib/whats-new.ts
// decides, against prefs.whatsNewSeen), and whenever asked from the palette
// or Settings › About (openWhatsNew). App.tsx mounts it once.

const useWhatsNew = create<{ release?: Release }>()(() => ({}));

export function openWhatsNew() {
  useWhatsNew.setState({ release: latestRelease(RELEASES) });
}

// useWhatsNewAfterUpdate shows the dialog once after an update, and keeps
// the version seen either way.
export function useWhatsNewAfterUpdate() {
  const seen = usePrefs((p) => p.whatsNewSeen);
  // Decided once, as the app starts, not on every change of seen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: decided once as the app starts, not again when seen changes.
  useEffect(() => {
    const d = decide({ firstRun, seen, current: APP_VERSION, releases: RELEASES });
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
              What's new in {release.version}
            </DialogTitle>
            <DialogDescription>What this version brings.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ul className="flex flex-col gap-2 text-sm">
              {release.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button />}>Got it</DialogClose>
          </DialogFooter>
        </DialogPopup>
      )}
    </Dialog>
  );
}
