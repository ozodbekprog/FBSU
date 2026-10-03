"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ttpu-nav-collapsed";

let cached: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (cached !== null) return cached;
  cached = window.localStorage.getItem(STORAGE_KEY) === "1";
  return cached;
}

function write(value: boolean) {
  cached = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNavCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => write(!read()), []);
  return { collapsed, toggle };
}