// When a session the server will end (User.sessionEndsAt) needs the
// person: a warning WARN_BEFORE_MS before, with a way to stay, and the end
// itself. Pure, so session-end.test.ts runs it in node; the timers are in
// hooks/use-session-end.ts.

export const WARN_BEFORE_MS = 2 * 60_000;

// The longest a browser timer waits (about 24.8 days): a session further off
// is looked at again when this one fires.
const MAX_TIMER = 2 ** 31 - 1;

// sessionTimes says how long until the warning and until the end, from now;
// undefined when the session doesn't end or the date can't be read. A
// warning already due comes at once.
export function sessionTimes(endsAt: string | undefined, now: number): { warnIn: number; endIn: number } | undefined {
  const end = endsAt ? Date.parse(endsAt) : Number.NaN;
  if (Number.isNaN(end)) return undefined;
  const endIn = Math.min(Math.max(0, end - now), MAX_TIMER);
  return { warnIn: Math.max(0, endIn - WARN_BEFORE_MS), endIn };
}
