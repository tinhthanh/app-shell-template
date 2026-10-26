import { useEffect, useReducer } from "react";

import { toastError } from "@/components/error-note";
import { toastManager } from "@/components/ui/toast";
import { announce } from "@/lib/announce";
import { client } from "@/lib/api";
import { t } from "@/lib/i18n";
import { refreshed, signedOut, useSession } from "@/lib/session";
import { sessionTimes } from "@/lib/session-end";

// useSessionEnd warns the person shortly before the server ends their
// session (lib/session-end.ts), with Stay signed in (client.refreshSession,
// which answers with a later end), and signs them out when it ends, the
// sign-in page saying why. A session the server doesn't end has neither.
export function useSessionEnd() {
  const endsAt = useSession((s) => s.user?.sessionEndsAt);
  // An end further than a timer waits is looked at again when it fires.
  const [again, lookAgain] = useReducer((n: number) => n + 1, 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: again is only the cue to look at the same end once more.
  useEffect(() => {
    const times = sessionTimes(endsAt, Date.now());
    if (!times) return;
    if (!times.final) {
      const later = window.setTimeout(lookAgain, times.endIn);
      return () => window.clearTimeout(later);
    }
    let warning: string | undefined;
    const warn = window.setTimeout(() => {
      warning = toastManager.add({
        title: t("shell.session.ending"),
        description: t("shell.session.endingBody"),
        type: "warning",
        timeout: 0,
        actionProps: {
          children: t("shell.session.stay"),
          onClick: () =>
            client.refreshSession().then(
              // Every tab takes the longer session (lib/session.ts).
              (user) => refreshed(user),
              (err) => toastError(err, t("shell.session.stayFailed")),
            ),
        },
      });
      announce(t("shell.session.ending"), true);
    }, times.warnIn);
    const end = window.setTimeout(() => {
      if (warning) toastManager.close(warning);
      // The sign-in page says why (signin-view.tsx).
      signedOut({ why: "ended" });
    }, times.endIn);
    return () => {
      window.clearTimeout(warn);
      window.clearTimeout(end);
      if (warning) toastManager.close(warning);
    };
  }, [endsAt, again]);
}
