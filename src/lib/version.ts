// Versions as numbers: "0.3.10" after "0.3.9". For What's new (which notes
// are newer than the app) and for any resource whose records have one.
// Pure, so version.test.ts runs it in node.

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
