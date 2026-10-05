export type AppRole =
  | "ADMIN"
  | "REKTOR"
  | "DEKAN"
  | "KAFEDRA_MUDIRI"
  | "REGISTRAR"
  | "TYUTOR"
  | "TEACHER"
  | "STUDENT";

const MONITORING_ROLES: readonly string[] = [
  "ADMIN",
  "REKTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
];

const APPROVER_ROLES: readonly string[] = ["ADMIN", "REGISTRAR"];

const LEADERSHIP_ROLES: readonly string[] = ["REKTOR", "DEKAN", "KAFEDRA_MUDIRI"];

export function canViewMonitoring(role: string): boolean {
  return MONITORING_ROLES.includes(role);
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
