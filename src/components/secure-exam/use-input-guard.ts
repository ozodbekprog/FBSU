"use client";

import { useEffect, useRef } from "react";
import {
  KeyboardAnomalyTracker,
  MouseAnomalyTracker,
  type InputAnomalyType,
} from "@/modules/secure-exam/input-anomaly";

export function useInputGuard(options: {
  active: boolean;
  onEvent: (type: InputAnomalyType, meta?: Record<string, string | number | boolean>) => void;
}): void {
  const { active, onEvent } = options;
  const kbRef = useRef<KeyboardAnomalyTracker | null>(null);
  const mvRef = useRef<MouseAnomalyTracker | null>(null);
  if (kbRef.current === null) kbRef.current = new KeyboardAnomalyTracker();
  if (mvRef.current === null) mvRef.current = new MouseAnomalyTracker();
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!active) return;
    const kb = kbRef.current;
    const mv = mvRef.current;
    if (!kb || !mv) return;

    if (navigator.webdriver === true) {
      onEventRef.current("AUTOMATION_DETECTED", { source: "webdriver" });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const anomaly = kb.key(Date.now(), event.isTrusted);
      if (anomaly) onEventRef.current(anomaly.type, anomaly.meta);
    };
    const onMouseMove = (event: MouseEvent) => {
      const anomaly = mv.move(event.clientX, event.clientY, Date.now());
      if (anomaly) onEventRef.current(anomaly.type, anomaly.meta);
    };
    const onClick = (event: MouseEvent) => {
      const anomaly = mv.click(Date.now(), event.clientX, event.clientY, event.isTrusted);
      if (anomaly) onEventRef.current(anomaly.type, anomaly.meta);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [active]);
}
