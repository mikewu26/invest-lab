"use client";
import { DEFAULT_DATA, type Store, type UserData } from "./types";

const KEY = "invest-lab:v1";
const listeners = new Set<(d: UserData) => void>();
let cache: UserData | null = null;

function read(): UserData {
  if (cache) return cache;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserData>;
      cache = {
        ...DEFAULT_DATA,
        ...parsed,
        plan: { ...DEFAULT_DATA.plan, ...parsed.plan },
      } as UserData;
      return cache;
    }
  } catch {
    /* corrupted or blocked storage: fall back to defaults */
  }
  return DEFAULT_DATA;
}

export const localStore: Store = {
  load: read,
  save(data) {
    cache = data;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked — keep in memory for this session */
    }
    listeners.forEach((fn) => fn(data));
  },
  subscribe(fn) {
    listeners.add(fn);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        cache = null;
        fn(read());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", onStorage);
    };
  },
};
