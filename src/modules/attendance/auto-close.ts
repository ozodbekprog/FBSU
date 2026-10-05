import { prisma } from "@/lib/prisma";

export const AUTO_ABSENT_NOTE = "Avtomatik: QR davomatda belgilanmagan";

export async function finalizeExpiredAttendanceSessions(courseId?: string): Promise<number> {
  const now = new Date();
  const expired = await prisma.attendanceSession.findMany({
    where: {
      finalizedAt: null,
      expiresAt: { lte: now },
      ...(courseId ? { courseId } : {}),
    },
    select: { id: true, courseId: true, date: true },
  });

  let finalized = 0;
  for (const session of expired) {
    const active = await prisma.attendanceSession.count({
      where: {
        courseId: session.courseId,
        finalizedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (active > 0) continue;

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: session.courseId, status: "ACTIVE" },
      select: { userId: true },
    });
    if (enrollments.length > 0) {
      const existing = await prisma.attendance.findMany({
        where: { courseId: session.courseId, date: session.date },
        select: { studentId: true },
      });
      const seen = new Set(existing.map((row) => row.studentId));
      const missing = enrollments.filter((row) => !seen.has(row.userId));
      if (missing.length > 0) {
        await prisma.attendance.createMany({
          data: missing.map((row) => ({
            courseId: session.courseId,
            studentId: row.userId,
            date: session.date,
            status: "ABSENT" as const,
            note: AUTO_ABSENT_NOTE,
          })),
          skipDuplicates: true,
        });
      }
    }

    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { finalizedAt: now },
    });
    finalized += 1;
  }

  return finalized;
}
