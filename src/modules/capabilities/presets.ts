import { ALL_CAPABILITIES, type Capability } from "./registry";

export type RoleName =
  | "OWNER"
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
  "OWNER",
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
  OWNER: ALL_CAPABILITIES,
  ADMIN: ALL_CAPABILITIES,
  REKTOR: [
    "monitoring.view",
    "analysis.view",
    "access.viewLogs",
    "gradeChanges.review",
    "tasks.manage",
    "finance.view",
    "diplomas.view",
    "documents.view",
  ],
  PRO_RECTOR: [
    "monitoring.view",
    "analysis.view",
    "access.viewLogs",
    "tasks.manage",
    "finance.view",
    "diplomas.view",
    "documents.view",
  ],
  DEKAN: ["monitoring.view", "analysis.view", "tasks.manage", "transcript.view"],
  KAFEDRA_MUDIRI: ["monitoring.view", "analysis.view", "tasks.manage", "transcript.view"],
  REGISTRAR: [
    "monitoring.view",
    "academic.manage",
    "approvals.decide",
    "access.scan",
    "access.viewLogs",
    "gradeChanges.review",
    "tasks.manage",
    "finance.view",
    "diplomas.view",
    "documents.view",
    "schedule.manage",
  ],
  BUXGALTER: ["finance.manage", "finance.view", "access.viewLogs"],
  TYUTOR: ["curator.manage", "tasks.manage"],
  TEACHER: [
    "analysis.view",
    "curator.manage",
    "course.manage",
    "course.grade",
    "quiz.manage",
    "attendance.open",
    "exam.proctor",
    "certificates.issue",
    "transcript.view",
    "schedule.manage",
    "exams.manage",
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
