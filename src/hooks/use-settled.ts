import { useEffect, useState } from "react";

// useSettled is a value once it has stopped changing for ms: what a list asks
// the server for while someone types in its search, so a word is one
// request, not one a letter. The field and the address follow the typing at
// once; only the read waits.
export function useSettled<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (Object.is(settled, value)) return;
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms, settled]);
  return settled;
}
