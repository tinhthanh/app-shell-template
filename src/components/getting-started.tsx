import { CheckIcon, XIcon } from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { t } from "@/lib/i18n";
import { dismissOnboarding, STEPS } from "@/lib/onboarding";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

// GettingStarted is Home's list of first things to try (lib/onboarding.ts):
// each step ticks itself as the person does it, and the close button puts
// the list away for good. A product writes its own steps. After Shipyard's
// "Try the demo" card (github.com/cosscom/shipyard, MIT).
export function GettingStarted() {
  const { done, dismissed } = usePrefs((p) => p.onboarding);
  if (dismissed) return null;
  const count = STEPS.filter((s) => done.includes(s.id)).length;
  return (
    <section aria-labelledby="getting-started" data-testid="getting-started" className="mt-8 rounded-xl border bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id="getting-started" className="text-row">
            {t("shell.onboarding.title")}
          </h3>
          <p className="mt-0.5 text-desc text-muted-foreground">{t("shell.onboarding.description")}</p>
        </div>
        <span className="shrink-0 text-meta text-muted-foreground tabular-nums" data-testid="getting-started-progress">
          {t("shell.onboarding.progress", { done: count, total: STEPS.length })}
        </span>
        <button
          type="button"
          aria-label={t("shell.onboarding.dismiss")}
          data-testid="getting-started-dismiss"
          onClick={dismissOnboarding}
          className="-me-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {STEPS.map((s) => {
          const ok = done.includes(s.id);
          // The words may carry a key (⌘K): it is drawn as one.
          const [before, key, after] = t(s.title).split(/(⌘\S+?)(?=[\s,.]|$)/);
          return (
            <li key={s.id} data-testid={`step-${s.id}`} data-done={ok || undefined} className={cn("flex items-center gap-2 text-desc", ok ? "text-muted-foreground line-through" : "text-foreground")}>
              <span aria-hidden className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded-full border", ok && "border-success bg-success/16 text-success-foreground")}>
                {ok && <CheckIcon className="size-3" />}
              </span>
              <span>
                {before}
                {key && <Kbd className="mx-0.5 h-4.5 text-tag">{key}</Kbd>}
                {after}
              </span>
              {ok && <span className="sr-only">✓</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
