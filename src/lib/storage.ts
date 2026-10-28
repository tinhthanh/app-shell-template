// Small localStorage helpers. Storage can be missing or throw (private
// windows, cleared site data), and the app must work without it.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

// once says whether this is the first time key was seen in this tab: for
// something to try exactly once per visit, such as a reload after a deploy.
export function once(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Remembering is a convenience; losing it is fine.
  }
}

// tabLoad and tabSave keep a value for this tab only (sessionStorage): it
// survives a reload of the tab, and another tab has its own.
export function tabLoad(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function tabSave(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // This tab forgets on reload; the browser's last pick still holds.
  }
}
