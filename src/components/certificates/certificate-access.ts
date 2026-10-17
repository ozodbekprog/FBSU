import "server-only";
import type { Role } from "@prisma/client";
import { hasCapability } from "@/modules/capabilities";

export type CertificateAccessUser = { id: string; role: Role };

export function canManageCertificate(
  user: CertificateAccessUser,
  certificate: { course: { teacherId: string } },
) {
  return (
    user.role === "ADMIN" ||
    (hasCapability(user.role, "certificates.issue") && certificate.course.teacherId === user.id)
  );
}

export function certificateSerial(id: string) {
  return `FBSU-${id.slice(-8).toUpperCase()}`;
}

export type CertificateGradeTone = "green" | "blue" | "amber" | "slate";

export type CertificateGradeLabels = {
  none: string;
  excellent: string;
  good: string;
  satisfactory: string;
  unsatisfactory: string;
};

export function certificateGrade(
  grade: number | null | undefined,
  labels: CertificateGradeLabels,
): {
  label: string;
  tone: CertificateGradeTone;
} {
  if (grade == null) return { label: labels.none, tone: "slate" };
  if (grade >= 90) return { label: labels.excellent, tone: "green" };
  if (grade >= 70) return { label: labels.good, tone: "blue" };
  if (grade >= 60) return { label: labels.satisfactory, tone: "amber" };
  return { label: labels.unsatisfactory, tone: "slate" };
}
