import { ApiError } from "./errors.ts";
import { t } from "./i18n.ts";

// Errors in plain words. What the server or the network said is rarely what
// the person needs to read: explain turns an error into a short title, one
// sentence, and whether trying again can help. The original words are kept
// as details, shown behind "Details" (components/error-note.tsx), never as
// the main message. Codes come from the API ({error, code}); text patterns
// cover errors that never had one. The words are the common.error.* ones
// (lib/messages/common.ts), in the language in use. Pure apart from that
// language, so explain.test.ts runs it in node.

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
  const text = s.trim().replace(/\s+/g, " ");
  if (!text) return text;
  const first = text.charAt(0).toUpperCase() + text.slice(1);
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

  if (code === "bad_response") return out(t("common.error.badResponse.title"), t("common.error.badResponse.message"));
  if (code === "timeout" || status === 504) return out(t("common.error.timeout.title"), t("common.error.timeout.message"), true);
  if (code === "network" || /failed to fetch|networkerror|load failed/i.test(raw)) return out(t("common.error.network.title"), t("common.error.network.message"), true);
  if (code === "unavailable" || status === 502 || status === 503) return out(t("common.error.unavailable.title"), t("common.error.unavailable.message"), true);
  if (status === 401) return out(t("common.error.signedOut.title"), t("common.error.signedOut.message"));
  if (status === 403) return out(t("common.error.forbidden.title"), t("common.error.forbidden.message"));
  if (code === "not_found" || status === 404) return out(t("common.error.notFound.title"), t("common.error.notFound.message"), true);
  if (code === "conflict" || status === 409) return out(t("common.error.conflict.title"), t("common.error.conflict.message"), true);
  if (code === "invalid" || status === 400 || status === 422) return out(t("common.error.invalid.title"), !raw || looksRaw(raw) ? t("common.error.invalid.message") : sentence(raw));
  if (status === 429) return out(t("common.error.tooMany.title"), t("common.error.tooMany.message"), true);
  if (status !== undefined && status >= 500) return out(t("common.error.server.title"), t("common.error.server.message"), true);
  if (looksRaw(raw)) return out(t("common.error.unknown.title"), t("common.error.unknown.message"), true);
  return { title: t("common.error.unknown.title"), message: sentence(raw) || t("common.error.unknown.message"), code, status };
}

// plainError is explain's one sentence, for an error shown inline.
export const plainError = (err: unknown): string => explain(err).message;
