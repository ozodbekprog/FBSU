import { hasCapability } from "@/modules/capabilities";

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

const LEADERSHIP_ROLES: readonly string[] = ["REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI"];

export function canViewMonitoring(role: string): boolean {
  return hasCapability(role, "monitoring.view");
}

export function canViewAnalysis(role: string): boolean {
  return hasCapability(role, "analysis.view");
}

export function canApprove(role: string): boolean {
  return hasCapability(role, "approvals.decide");
}

export function isLeadership(role: string): boolean {
  return LEADERSHIP_ROLES.includes(role);
}

export function isTyutor(role: string): boolean {
  return role === "TYUTOR";
}

export function canScanAccess(role: string): boolean {
  return hasCapability(role, "access.scan");
}

export function canViewAccessLogs(role: string): boolean {
  return hasCapability(role, "access.viewLogs");
}
