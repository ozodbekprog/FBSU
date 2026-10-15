import type { EventSeverity } from "./types";

export const SECURE_EVENT_TYPES = [
  "TAB_HIDDEN",
  "TAB_VISIBLE",
  "FULLSCREEN_ENTER",
  "FULLSCREEN_EXIT",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "COPY",
  "CUT",
  "PASTE",
  "CONTEXT_MENU",
  "KEY_BLOCKED",
  "PRINT_ATTEMPT",
  "MULTI_MONITOR",
  "MONITOR_OK",
  "WEBCAM_ON",
  "WEBCAM_OFF",
  "CLIENT_INFO",
  "SUBMIT",
  "TERMINATED",
  "TIMEOUT",
  "FACE_OK",
  "FACE_ABSENT",
  "FACE_MULTIPLE",
  "LOOK_AWAY",
  "FACE_MISMATCH",
  "FACE_LIVENESS",
  "KEY_ANOMALY",
  "MOUSE_ANOMALY",
  "AUTOMATION_DETECTED",
] as const;

export type SecureEventType = (typeof SECURE_EVENT_TYPES)[number];

export const EVENT_SEVERITY: Record<SecureEventType, EventSeverity> = {
  TAB_HIDDEN: "WARNING",
  TAB_VISIBLE: "INFO",
  FULLSCREEN_ENTER: "INFO",
  FULLSCREEN_EXIT: "WARNING",
  WINDOW_BLUR: "INFO",
  WINDOW_FOCUS: "INFO",
  COPY: "WARNING",
  CUT: "WARNING",
  PASTE: "WARNING",
  CONTEXT_MENU: "WARNING",
  KEY_BLOCKED: "WARNING",
  PRINT_ATTEMPT: "WARNING",
  MULTI_MONITOR: "CRITICAL",
  MONITOR_OK: "INFO",
  WEBCAM_ON: "INFO",
  WEBCAM_OFF: "WARNING",
  CLIENT_INFO: "INFO",
  SUBMIT: "INFO",
  TERMINATED: "INFO",
  TIMEOUT: "INFO",
  FACE_OK: "INFO",
  FACE_ABSENT: "WARNING",
  FACE_MULTIPLE: "CRITICAL",
  LOOK_AWAY: "WARNING",
  FACE_MISMATCH: "WARNING",
  FACE_LIVENESS: "WARNING",
  KEY_ANOMALY: "WARNING",
  MOUSE_ANOMALY: "WARNING",
  AUTOMATION_DETECTED: "CRITICAL",
};

export function severityOf(type: SecureEventType): EventSeverity {
  return EVENT_SEVERITY[type];
}

export function warningWeight(severity: EventSeverity, maxWarnings: number): number {
  if (severity === "INFO") return 0;
  if (severity === "WARNING") return 1;
  return Math.max(1, maxWarnings);
}

export function isSecureEventType(value: unknown): value is SecureEventType {
  return typeof value === "string" && (SECURE_EVENT_TYPES as readonly string[]).includes(value);
}
