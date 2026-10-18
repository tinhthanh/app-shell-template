// Words the shared pieces use everywhere: loading, failed, empty, forms, confirms, tables and errors (lib/explain.ts).
// English is the source; vi has a line for every key in it (lib/i18n.ts).

export const en = {} as const;

export const vi: Record<keyof typeof en, string> = {};
