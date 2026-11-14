"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

type PageState = { path: string; since: number };

function send(url: string, payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(url, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    });
  } catch {
    void 0;
  }
}

export function TrafficBeacon() {
  const pathname = usePathname();
  const state = useRef<PageState>({ path: pathname, since: Date.now() });

  const flush = useCallback(() => {
    const elapsed = Date.now() - state.current.since;
    if (elapsed >= 1000) {
      send("/api/traffic/dwell", { path: state.current.path, ms: elapsed });
    }
    state.current.since = Date.now();
  }, []);

  useEffect(() => {
    if (state.current.path === pathname) return;
    flush();
    state.current = { path: pathname, since: Date.now() };
  }, [pathname, flush]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush();
      } else {
        state.current.since = Date.now();
      }
    };
    const onPageHide = () => flush();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      send("/api/traffic/ping", { path: state.current.path });
    }, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(timer);
      flush();
    };
  }, [flush]);

  return null;
}
