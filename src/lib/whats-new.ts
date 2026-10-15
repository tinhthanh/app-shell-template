// What's new: the dialog the app shows once after it updates, with the
// release's notes (lib/releases.ts). Pure, so whats-new.test.ts runs it in
// node; components/whats-new/whats-new-dialog.tsx runs it against prefs.

export interface Release {
  // The version it ships in, as package.json has it.
  version: string;
  // What the person gets, one line each, in plain words.
  notes: string[];
}

// compareVersions orders "0.3.10" after "0.3.9". Anything that isn't
// numbers ("dev") sorts first.
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => (/^\d+(\.\d+)*$/.test(v) ? v.split(".").map(Number) : [-1]);
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// latestRelease is the newest release there are notes for: what the
// palette and Settings › About open.
export function latestRelease(releases: Release[]): Release | undefined {
  return [...releases].sort((a, b) => compareVersions(b.version, a.version))[0];
}

export interface Decision {
  // The release to show now, if any.
  show?: Release;
  // What to keep as seen.
  seen: string;
}

// decide is what happens as the app starts. A first run (no prefs saved
// before) shows nothing and counts as having seen this version. After an
// update, the newest release the running app includes, newer than the last
// one seen, shows once. Prefs from before the dialog existed (nothing
// seen) count as an update.
export function decide({ firstRun, seen, current, releases }: { firstRun: boolean; seen: string | null | undefined; current: string; releases: Release[] }): Decision {
  if (firstRun) return { seen: current };
  const fits = releases.filter((r) => compareVersions(r.version, current) <= 0 && (!seen || compareVersions(r.version, seen) > 0));
  const show = latestRelease(fits);
  // Never move seen backwards (a dev build older than the last release).
  const next = seen && compareVersions(seen, current) > 0 ? seen : current;
  return { show, seen: next };
}
