export type AppRole =
  | "ADMIN"
  | "REKTOR"
  | "PRO_RECTOR"
  | "DEKAN"
  | "KAFEDRA_MUDIRI"
  | "REGISTRAR"
  | "TYUTOR"
  | "TEACHER"
  | "STUDENT"
  | "XODIM";

const MONITORING_ROLES: readonly string[] = [
  "ADMIN",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
];

const APPROVER_ROLES: readonly string[] = ["ADMIN", "REGISTRAR"];

const LEADERSHIP_ROLES: readonly string[] = ["REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI"];

const ANALYSIS_ROLES: readonly string[] = [
  "ADMIN",
  "TEACHER",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
];

export function canViewMonitoring(role: string): boolean {
  return MONITORING_ROLES.includes(role);
}

export function canViewAnalysis(role: string): boolean {
  return ANALYSIS_ROLES.includes(role);
}

export function canApprove(role: string): boolean {
  return APPROVER_ROLES.includes(role);
}

export function isLeadership(role: string): boolean {
  return LEADERSHIP_ROLES.includes(role);
}

export function isTyutor(role: string): boolean {
  return role === "TYUTOR";
}

export function canScanAccess(role: string): boolean {
  // Buxgalter skanerlamaydi — u faqat o'tish tarihini ko'radi.
  return ["ADMIN", "REGISTRAR", "XODIM"].includes(role);
}

export function canViewAccessLogs(role: string): boolean {
  return ["ADMIN", "REGISTRAR", "XODIM", "REKTOR", "PRO_RECTOR", "BUXGALTER"].includes(role);
}
