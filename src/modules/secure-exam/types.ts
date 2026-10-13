export type EventSeverity = "INFO" | "WARNING" | "CRITICAL";

export type LimitAction = "WARN" | "TERMINATE";

export type ExamStatus = "SCHEDULED" | "ACTIVE" | "CLOSED";

export type RunStatus = "ACTIVE" | "SUBMITTED" | "TERMINATED";

export type ClientInfo = {
  clientId?: string;
  version?: string;
  platform?: string;
  screens?: number;
  fullscreen?: boolean;
  webcam?: boolean;
};

export type RunState = {
  status: RunStatus;
  finished: boolean;
  warnings: number;
  maxWarnings: number;
  limitAction: LimitAction;
  endsAt: string | null;
  serverNow: string;
  timeLeftSec: number | null;
};
