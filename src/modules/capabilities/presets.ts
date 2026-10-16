import { ALL_CAPABILITIES, type Capability } from "./registry";

export type RoleName =
  | "ADMIN"
  | "REKTOR"
  | "PRO_RECTOR"
  | "DEKAN"
  | "KAFEDRA_MUDIRI"
  | "REGISTRAR"
  | "BUXGALTER"
  | "TYUTOR"
  | "TEACHER"
  | "STUDENT"
  | "XODIM"
  | "OTA_ONA";

export const ROLES: readonly RoleName[] = [
  "ADMIN",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
  "BUXGALTER",
  "TYUTOR",
  "TEACHER",
  "STUDENT",
  "XODIM",
  "OTA_ONA",
];

export const ROLE_CAPABILITIES: Record<RoleName, readonly Capability[]> = {
  ADMIN: ALL_CAPABILITIES,
  REKTOR: ["monitoring.view", "analysis.view", "access.viewLogs", "gradeChanges.review", "tasks.manage"],
  PRO_RECTOR: ["monitoring.view", "analysis.view", "access.viewLogs", "tasks.manage"],
  DEKAN: ["monitoring.view", "analysis.view", "tasks.manage"],
  KAFEDRA_MUDIRI: ["monitoring.view", "analysis.view", "tasks.manage"],
  REGISTRAR: [
    "monitoring.view",
    "academic.manage",
    "approvals.decide",
    "access.scan",
    "access.viewLogs",
    "gradeChanges.review",
    "tasks.manage",
  ],
  BUXGALTER: ["finance.manage", "access.viewLogs"],
  TYUTOR: ["curator.manage", "tasks.manage"],
  TEACHER: [
    "analysis.view",
    "curator.manage",
    "course.manage",
    "course.grade",
    "quiz.manage",
    "attendance.open",
    "exam.proctor",
  ],
  STUDENT: [],
  XODIM: ["access.scan", "access.viewLogs"],
  OTA_ONA: ["parent.viewChild"],
};

export type CourseRelation = "teacher" | "student";

export const COURSE_RELATION_CAPABILITIES: Record<CourseRelation, readonly Capability[]> = {
  teacher: ["course.manage", "course.grade", "quiz.manage", "attendance.open", "exam.proctor"],
  student: [],
};
