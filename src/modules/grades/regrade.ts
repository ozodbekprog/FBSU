import type { Role } from "@prisma/client";

export type RegradeRole = Role;

/**
 * Baho allaqachon qo'yilgan (GRADED) va o'qituvchi ballni o'zgartirmoqchi bo'lsa —
 * registrator/admin tasdig'i talab qilinadi. Admin/registrator to'g'ridan-to'g'ri
 * o'zgartiradi; birinchi baholash (SUBMITTED/LATE -> GRADED) ham to'g'ridan-to'g'ri.
 */
export function needsApproval(
  role: RegradeRole,
  current: { status: string; score: number | null },
  nextScore: number | null,
): boolean {
  if (role !== "TEACHER") return false;
  if (current.status !== "GRADED") return false;
  return nextScore !== current.score;
}
