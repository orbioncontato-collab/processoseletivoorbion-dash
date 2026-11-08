"use client";

// Preferências, favoritas e histórico. Tudo fica só no navegador (localStorage).
import { useSyncExternalStore } from "react";
import type { FormState } from "./engine.ts";

export interface HistoryEntry {
  id: string;
  slug: string;
  at: number;
  state: FormState;
  label: string;
  value: number | string;
  unit?: string;
}

const KEYS = { dec: "mc.decimals", fav: "mc.favorites", hist: "mc.history" };
const MAX_HIST = 20;

const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let v = fallback;
  try {
    const s = window.localStorage.getItem(key);
    if (s) v = JSON.parse(s) as T;
  } catch {
    /* navegador sem localStorage: segue com o padrão */
  }
  cache.set(key, v);
  return v;
}

function write<T>(key: string, v: T) {
  cache.set(key, v);
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* sem armazenamento: vale só para esta visita */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key && Object.values(KEYS).includes(e.key)) {
      cache.delete(e.key);
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: never[] = [];

export function useDecimals(): [number, (d: number) => void] {
  const d = useSyncExternalStore(subscribe, () => read(KEYS.dec, 4), () => 4);
  return [d, (v) => write(KEYS.dec, v)];
}

export function useFavorites(): [string[], (slug: string) => void] {
  const fav = useSyncExternalStore(subscribe, () => read<string[]>(KEYS.fav, EMPTY), () => EMPTY);
  const toggle = (slug: string) => write(KEYS.fav, fav.includes(slug) ? fav.filter((s) => s !== slug) : [...fav, slug]);
  return [fav, toggle];
}

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, () => read<HistoryEntry[]>(KEYS.hist, EMPTY), () => EMPTY);
}

export function addHistory(e: Omit<HistoryEntry, "id" | "at">) {
  const list = read<HistoryEntry[]>(KEYS.hist, []);
  const entry: HistoryEntry = { ...e, id: Math.random().toString(36).slice(2, 10), at: Date.now() };
  write(KEYS.hist, [entry, ...list].slice(0, MAX_HIST));
}

export function removeHistory(id: string) {
  write(KEYS.hist, read<HistoryEntry[]>(KEYS.hist, []).filter((h) => h.id !== id));
}

export function clearHistory() {
  write(KEYS.hist, []);
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return read<HistoryEntry[]>(KEYS.hist, []).find((h) => h.id === id);
}
