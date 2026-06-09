import { useCallback, useSyncExternalStore } from "react";

export type AccentId = "none" | "rose" | "amber" | "emerald" | "sky" | "violet";

export type CoursePref = {
  accent?: AccentId;
  pinned?: boolean;
  muted?: boolean;
};

type PrefsMap = Record<string, CoursePref>;

const STORAGE_KEY = "disciplan:coursePrefs";

const listeners = new Set<() => void>();

function read(): PrefsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PrefsMap) : {};
  } catch {
    return {};
  }
}

let cache: PrefsMap = read();

function write(next: PrefsMap) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = read();
      l();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(l);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function courseKey(courseCode: string, section: string) {
  return `${courseCode}::${section}`;
}

export function getAllCoursePrefs(): PrefsMap {
  return cache;
}

export function useAllCoursePrefs(): PrefsMap {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => ({}),
  );
}

export function useCoursePref(key: string): [CoursePref, (patch: Partial<CoursePref>) => void] {
  const all = useAllCoursePrefs();
  const pref = all[key] ?? {};
  const setPref = useCallback(
    (patch: Partial<CoursePref>) => {
      const current = cache[key] ?? {};
      write({ ...cache, [key]: { ...current, ...patch } });
    },
    [key],
  );
  return [pref, setPref];
}
