import { prisma } from "@/lib/prisma";
import { finalStatusWithoutCheckout } from "@/modules/attendance/participation";

export const AUTO_ABSENT_NOTE = "Avtomatik: QR davomatda belgilanmagan";
export const AUTO_LEFT_EARLY_NOTE = "Avtomatik: chiqish QR belgilanmagan";

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
  if (expired.length === 0) return 0;

  const courseIds = [...new Set(expired.map((session) => session.courseId))];
  const activeSessions = await prisma.attendanceSession.findMany({
    where: { courseId: { in: courseIds }, finalizedAt: null, expiresAt: { gt: now } },
    select: { courseId: true },
  });
  const hasActive = new Set(activeSessions.map((session) => session.courseId));
  const pending = expired.filter((session) => !hasActive.has(session.courseId));
  if (pending.length === 0) return 0;

  const pendingCourseIds = [...new Set(pending.map((session) => session.courseId))];
  const [enrollments, existingAttendance, checkoutSessions, uncheckedRows] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId: { in: pendingCourseIds }, status: "ACTIVE" },
      select: { courseId: true, userId: true },
    }),
    prisma.attendance.findMany({
      where: { courseId: { in: pendingCourseIds } },
      select: { courseId: true, date: true, studentId: true },
    }),
    prisma.attendanceSession.findMany({
      where: { courseId: { in: pendingCourseIds }, kind: "CHECK_OUT" },
      select: { courseId: true, date: true },
    }),
    prisma.attendance.findMany({
      where: {
        courseId: { in: pendingCourseIds },
        checkOutAt: null,
        status: { in: ["PRESENT", "LATE"] },
      },
      select: { id: true, courseId: true, date: true, status: true },
    }),
  ]);

  const enrollmentByCourse = new Map<string, string[]>();
  for (const row of enrollments) {
    const list = enrollmentByCourse.get(row.courseId) ?? [];
    list.push(row.userId);
    enrollmentByCourse.set(row.courseId, list);
  }
  const attendanceKey = (courseId: string, date: Date, studentId: string) =>
    `${courseId}|${date.getTime()}|${studentId}`;
  const existingKeys = new Set(
    existingAttendance.map((row) => attendanceKey(row.courseId, row.date, row.studentId)),
  );
  const checkoutKeys = new Set(checkoutSessions.map((row) => `${row.courseId}|${row.date.getTime()}`));
  const uncheckedBySessionKey = new Map<string, string[]>();
  for (const row of uncheckedRows) {
    if (finalStatusWithoutCheckout(row.status) === row.status) continue;
    const key = `${row.courseId}|${row.date.getTime()}`;
    const list = uncheckedBySessionKey.get(key) ?? [];
    list.push(row.id);
    uncheckedBySessionKey.set(key, list);
  }

  let finalized = 0;
  for (const session of pending) {
    const userIds = enrollmentByCourse.get(session.courseId) ?? [];
    const missing = userIds.filter(
      (studentId) => !existingKeys.has(attendanceKey(session.courseId, session.date, studentId)),
    );
    if (missing.length > 0) {
      await prisma.attendance.createMany({
        data: missing.map((studentId) => ({
          courseId: session.courseId,
          studentId,
          date: session.date,
          status: "ABSENT" as const,
          note: AUTO_ABSENT_NOTE,
        })),
        skipDuplicates: true,
      });
      for (const studentId of missing) {
        existingKeys.add(attendanceKey(session.courseId, session.date, studentId));
      }
    }

    const sessionKey = `${session.courseId}|${session.date.getTime()}`;
    if (checkoutKeys.has(sessionKey)) {
      const ids = uncheckedBySessionKey.get(sessionKey) ?? [];
      if (ids.length > 0) {
        await prisma.attendance.updateMany({
          where: { id: { in: ids } },
          data: { status: "LEFT_EARLY", note: AUTO_LEFT_EARLY_NOTE },
        });
        uncheckedBySessionKey.set(sessionKey, []);
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
