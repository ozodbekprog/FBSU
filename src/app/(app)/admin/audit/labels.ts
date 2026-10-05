import type { Dictionary } from "@/i18n";

export type AuditBadgeTone =
  | "slate"
  | "brand"
  | "blue"
  | "green"
  | "amber"
  | "rose"
  | "purple"
  | "gold";

type Translate = (key: keyof Dictionary, params?: Record<string, string | number>) => string;

const ACTION_META: Record<string, { label: keyof Dictionary; tone: AuditBadgeTone }> = {
  "schedule.status": { label: "admAuditActionScheduleStatus", tone: "amber" },
  "submission.grade": { label: "admAuditActionSubmissionGrade", tone: "green" },
  "admin.user.update": { label: "admAuditActionUserUpdate", tone: "brand" },
  "admin.settings.update": { label: "admAuditActionSettingsUpdate", tone: "purple" },
  "certificate.issue": { label: "admAuditActionCertificateIssue", tone: "gold" },
  "order.update": { label: "admAuditActionOrderUpdate", tone: "blue" },
};

export function auditActionLabel(action: string, t: Translate) {
  const key = ACTION_META[action]?.label;
  return key ? t(key) : action;
}

export function auditActionTone(action: string): AuditBadgeTone {
  return ACTION_META[action]?.tone ?? "slate";
}
