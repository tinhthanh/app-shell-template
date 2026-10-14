import { ApiError } from "./errors.ts";

// Errors in plain words. What the server or the network said is rarely what
// the person needs to read: explain turns an error into a short title, one
// sentence, and whether trying again can help. The original words are kept
// as details, shown behind "Details" (components/error-note.tsx), never as
// the main message. Codes come from the API ({error, code}); text patterns
// cover errors that never had one. Pure, so explain.test.ts runs it in node.

export interface Explained {
  title: string;
  message: string;
  // Whether a "Try again" is worth offering.
  retry?: boolean;
  // What was actually said, when the message is not it.
  details?: string;
  code?: string;
  status?: number;
}

// looksRaw is text a program wrote for another program.
export function looksRaw(text: string): boolean {
  return [/\b(errno|EOF|ECONNREFUSED|ECONNRESET|ETIMEDOUT|TypeError|SyntaxError)\b/, /^\d{3} [A-Z]/, /^[a-z]+(\.[a-z]+)+: /].some((r) => r.test(text.trim()));
}

const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const first = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…)]$/.test(first) ? first : `${first}.`;
};

function rawOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

export function explain(err: unknown): Explained {
  const raw = rawOf(err).trim();
  const api = err instanceof ApiError ? err : undefined;
  const code = api?.code;
  const status = api?.status;
  const out = (title: string, message: string, retry?: boolean): Explained => ({ title, message, retry, details: raw && raw !== message ? raw : undefined, code, status });

  if (code === "timeout" || status === 504) return out("The server isn't answering", "The connection may be slow or down. Try again in a moment.", true);
  if (code === "network" || /failed to fetch|networkerror|load failed/i.test(raw))
    return out("Can't reach the server", "This computer may be offline, or the server may be down. Try again in a moment.", true);
  if (code === "unavailable" || status === 502 || status === 503) return out("The server is busy", "It's down or restarting. Try again in a moment.", true);
  if (status === 401) return out("You're signed out", "Sign in again to carry on.");
  if (status === 403) return out("You can't do that", "Your account doesn't have access to this.");
  if (code === "not_found" || status === 404) return out("It's gone", "It may have been removed from somewhere else.", true);
  if (code === "conflict" || status === 409) return out("Someone changed it first", "Reload to see the latest, then try again.", true);
  if (code === "invalid" || status === 400 || status === 422)
    return out("That can't be saved", !raw || looksRaw(raw) ? "Something in it isn't right. Details has what the server said." : sentence(raw));
  if (status === 429) return out("Too many tries", "Wait a minute, then try again.", true);
  if (status !== undefined && status >= 500) return out("The server hit an error", "Something went wrong on its side. Try again in a moment.", true);
  if (looksRaw(raw)) return out("Something went wrong", "The app couldn't finish that.", true);
  return { title: "Something went wrong", message: sentence(raw) || "The app couldn't finish that.", code, status };
}

// plainError is explain's one sentence, for an error shown inline.
export const plainError = (err: unknown): string => explain(err).message;
