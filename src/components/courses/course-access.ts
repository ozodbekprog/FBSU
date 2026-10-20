import "server-only";
import type { MaterialType, Role } from "@prisma/client";
import { hasCapability } from "@/modules/capabilities";

export type AccessUser = { id: string; role: Role };

type CourseAccessShape = {
  teacherId: string;
  teacherIds?: string[];
  managerIds?: string[];
  assistantIds?: string[];
};

function isAdmin(user: AccessUser) {
  return user.role === "ADMIN" || user.role === "OWNER";
}

function isManager(user: AccessUser, course: CourseAccessShape) {
  return course.teacherId === user.id || (course.managerIds?.includes(user.id) ?? false);
}

function isAssistant(user: AccessUser, course: CourseAccessShape) {
  return course.assistantIds?.includes(user.id) ?? false;
}

function isStaff(user: AccessUser, course: CourseAccessShape) {
  return course.teacherId === user.id || (course.teacherIds?.includes(user.id) ?? false);
}

export function canManageCourse(user: AccessUser, course: CourseAccessShape) {
  return isAdmin(user) || (hasCapability(user.role, "course.manage") && isManager(user, course));
}

export function canGradeCourse(user: AccessUser, course: CourseAccessShape) {
  if (isAdmin(user)) return true;
  if (!hasCapability(user.role, "course.grade")) return false;
  return isManager(user, course) || isAssistant(user, course);
}

export function canViewCourse(
  user: AccessUser,
  course: CourseAccessShape,
  isEnrolled: boolean,
) {
  return canGradeCourse(user, course) || isStaff(user, course) || isEnrolled;
}

export function isValidHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

export function isAllowedFileUrl(value: string) {
  return isValidHttpUrl(value) || /^\/(api\/)?uploads\/\S+$/.test(value);
}

export function materialRuleError(
  type: MaterialType,
  content: string | null | undefined,
  fileUrl: string | null | undefined,
) {
  if (type === "TEXT" && !content) return "Matn kiritilishi shart";
  if ((type === "LINK" || type === "VIDEO") && !content) return "Havola (URL) kiritilishi shart";
  if ((type === "LINK" || type === "VIDEO") && content && !isValidHttpUrl(content)) {
    return "Havola http:// yoki https:// bilan boshlanishi kerak";
  }
  if (type === "FILE" && !fileUrl) return "Fayl havolasi (URL) kiritilishi shart";
  if (type === "FILE" && fileUrl && !isAllowedFileUrl(fileUrl)) {
    return "Fayl havolasi http://, https:// yoki /api/uploads/ bilan boshlanishi kerak";
  }
  return null;
}
