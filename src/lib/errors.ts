// ApiError is what a failed call throws (lib/api.ts, lib/mock.ts). code,
// when the server sent one, is what to branch on ("not_found",
// "conflict"…); the message is for people. On its own here, with relative
// imports only, so the mock and the node tests can throw it without
// loading the client.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
