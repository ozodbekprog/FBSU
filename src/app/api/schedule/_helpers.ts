import type { Role } from "@prisma/client";

export type StaffUser = { id: string; role: Role; name: string };
export type TeacherOwnedEntry = { teacherId: string | null; teacher: string | null };
export type Parity = "odd" | "even";

export function parityMatches(entryParity: string | null, weekParity: Parity): boolean {
  return entryParity === null || entryParity === weekParity;
}

export function normalizeTeacher(name: string): string {
  return name.replace(/\./g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function canManageEntry(user: StaffUser, entry: TeacherOwnedEntry): boolean {
  if (user.role === "ADMIN" || user.role === "REGISTRAR") return true;
  if (entry.teacherId) return entry.teacherId === user.id;
  if (!entry.teacher) return false;
  return normalizeTeacher(entry.teacher) === normalizeTeacher(user.name);
}

export function canApproveSchedule(role: Role): boolean {
  return role === "ADMIN" || role === "REGISTRAR";
}

export function initialApproval(role: Role): "PENDING" | "APPROVED" {
  return role === "TEACHER" ? "PENDING" : "APPROVED";
}
