import type { SecureEventType } from "@/modules/secure-exam/events";
import type { EventSeverity } from "@/modules/secure-exam/types";
import type { Dictionary } from "@/i18n/uz";

export const EVENT_LABEL_KEY: Record<SecureEventType, keyof Dictionary> = {
  TAB_HIDDEN: "secEventTAB_HIDDEN",
  TAB_VISIBLE: "secEventTAB_VISIBLE",
  FULLSCREEN_ENTER: "secEventFULLSCREEN_ENTER",
  FULLSCREEN_EXIT: "secEventFULLSCREEN_EXIT",
  WINDOW_BLUR: "secEventWINDOW_BLUR",
  WINDOW_FOCUS: "secEventWINDOW_FOCUS",
  COPY: "secEventCOPY",
  CUT: "secEventCUT",
  PASTE: "secEventPASTE",
  CONTEXT_MENU: "secEventCONTEXT_MENU",
  KEY_BLOCKED: "secEventKEY_BLOCKED",
  PRINT_ATTEMPT: "secEventPRINT_ATTEMPT",
  MULTI_MONITOR: "secEventMULTI_MONITOR",
  MONITOR_OK: "secEventMONITOR_OK",
  WEBCAM_ON: "secEventWEBCAM_ON",
  WEBCAM_OFF: "secEventWEBCAM_OFF",
  CLIENT_INFO: "secEventCLIENT_INFO",
  SUBMIT: "secEventSUBMIT",
  TERMINATED: "secEventTERMINATED",
  TIMEOUT: "secEventTIMEOUT",
  FACE_OK: "secEventFACE_OK",
  FACE_ABSENT: "secEventFACE_ABSENT",
  FACE_MULTIPLE: "secEventFACE_MULTIPLE",
  LOOK_AWAY: "secEventLOOK_AWAY",
  FACE_MISMATCH: "secEventFACE_MISMATCH",
  FACE_LIVENESS: "secEventFACE_LIVENESS",
  KEY_ANOMALY: "secEventKEY_ANOMALY",
  MOUSE_ANOMALY: "secEventMOUSE_ANOMALY",
  AUTOMATION_DETECTED: "secEventAUTOMATION_DETECTED",
  DUPLICATE_TAB: "secEventDUPLICATE_TAB",
  MOUSE_LEFT: "secEventMOUSE_LEFT",
  DRAG_ATTEMPT: "secEventDRAG_ATTEMPT",
  AUX_CLICK: "secEventAUX_CLICK",
  CAMERA_BLOCKED: "secEventCAMERA_BLOCKED",
  SNAPSHOT: "secEventSNAPSHOT",
  FACE_MISSING: "secEventFACE_MISSING",
  FACE_TURNED: "secEventFACE_TURNED",
  MULTIPLE_FACES: "secEventMULTIPLE_FACES",
};

export const SEVERITY_TONE: Record<EventSeverity, "slate" | "amber" | "rose"> = {
  INFO: "slate",
  WARNING: "amber",
  CRITICAL: "rose",
};

export function eventLabelKey(type: string): keyof Dictionary | null {
  if (type in EVENT_LABEL_KEY) {
    return EVENT_LABEL_KEY[type as SecureEventType];
  }
  return null;
}
