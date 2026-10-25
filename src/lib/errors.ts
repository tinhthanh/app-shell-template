// ApiError is what a failed call throws (lib/api.ts, lib/mock.ts). code,
// when the server sent one, is what to branch on ("not_found",
// "conflict"…); the message is for people; field, on a refusal with code
// "invalid", names the field the message is about, so a form can put it
// there (components/form-dialog.tsx). On its own here, with relative
// imports only, so the mock and the node tests can throw it without
// loading the client.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly field?: string;
  // How long the server asked to be left before the next try (a 429's or a
  // 503's Retry-After), in milliseconds.
  retryAfter?: number;
  constructor(message: string, status: number, code?: string, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}
