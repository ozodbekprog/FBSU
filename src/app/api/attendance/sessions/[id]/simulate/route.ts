import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: { course: { select: { teacherId: true } } },
  });
  if (!session) {
    return Response.json({ ok: false, error: "Sessiya topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, session.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    return Response.json({ ok: false, error: "Sessiya faol emas" }, { status: 400 });
  }

  if (session.kind === "CHECK_OUT") {
    const candidates = await prisma.attendance.findMany({
      where: { courseId: session.courseId, date: session.date, checkOutAt: null },
      include: { student: { select: { id: true, name: true } } },
    });
    if (candidates.length === 0) {
      return Response.json(
        { ok: false, error: "Simulyatsiya uchun ochiq yozuv yo'q" },
        { status: 400 },
      );
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const updated = await prisma.attendance.update({
      where: { id: pick.id },
      data: {
        checkOutAt: new Date(),
        note: pick.note?.includes("Demo") ? pick.note : `${pick.note ?? "QR orqali"} · Demo chiqish`,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "attendance.demo-simulate",
        entity: "Attendance",
        entityId: updated.id,
        meta: { sessionId: session.id, courseId: session.courseId, studentId: pick.student.id, checkout: true },
      },
    });
    return Response.json({
      ok: true,
      data: { studentId: pick.student.id, name: pick.student.name, status: updated.status, demo: true, checkout: true },
    });
  }

  const enrolled = await prisma.enrollment.findMany({
    where: { courseId: session.courseId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  const students = enrolled.filter((row) => row.user.role === "STUDENT");
  const marked = await prisma.attendance.findMany({
    where: { courseId: session.courseId, date: session.date },
    select: { studentId: true },
  });
  const markedIds = new Set(marked.map((row) => row.studentId));
  const remaining = students.filter((row) => !markedIds.has(row.user.id));
  if (remaining.length === 0) {
    return Response.json(
      { ok: false, error: "Barcha talabalar allaqachon belgilangan" },
      { status: 400 },
    );
  }

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  const attendance = await prisma.attendance.create({
    data: {
      courseId: session.courseId,
      studentId: pick.user.id,
      date: session.date,
      status: "PRESENT",
      note: "Demo simulyatsiya",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "attendance.demo-simulate",
      entity: "Attendance",
      entityId: attendance.id,
      meta: { sessionId: session.id, courseId: session.courseId, studentId: pick.user.id },
    },
  });

  return Response.json({
    ok: true,
    data: { studentId: pick.user.id, name: pick.user.name, status: "PRESENT", demo: true },
  });
}
