// A setting that is a list's default filter ("Hide done tasks"), the one way:
// when the list opens and its address names neither that filter nor one
// that overrides it, the setting's value is written into the address
// (replacing, not adding a step to Back). So the address always says what the
// list shows: a link sent on means the same to whoever opens it, whatever
// their own setting, and the list's chip writes "show" or "hide" to change
// it. Pure, so default-filter.test.ts runs it in node; views/tasks/ is the
// worked example (AGENTS.md › A setting).

// withDefault is the view as its address should be, or undefined when it
// already says: key is the filter, value the setting's (undefined when the
// setting is off, which writes nothing), unless the filters that override it.
export function withDefault<V extends object, K extends keyof V>(view: V, key: K, value: V[K] | undefined, unless: readonly (keyof V)[] = []): V | undefined {
  if (value === undefined || view[key] !== undefined) return undefined;
  if (unless.some((k) => view[k] !== undefined)) return undefined;
  return { ...view, [key]: value };
}
