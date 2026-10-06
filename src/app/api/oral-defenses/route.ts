import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const createSchema = z.object({
  assignmentId: z.string().trim().min(1),
  studentId: z.string().trim().min(1).optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const assignmentId = new URL(request.url).searchParams.get("assignmentId");
  if (!assignmentId) {
    return Response.json({ ok: false, error: "assignmentId kerak" }, { status: 400 });
  }
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, courseId: true, course: { select: { teacherId: true } } },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }

  if (user.role === "STUDENT") {
    const defense = await prisma.oralDefense.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
    });
    return Response.json({ ok: true, data: { defense, canManage: false } });
  }

  if (!canManageCourse(user, { teacherId: assignment.course.teacherId })) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const defenses = await prisma.oralDefense.findMany({
    where: { assignmentId },
    include: { student: { select: { id: true, name: true, group: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ ok: true, data: { defenses, canManage: true } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: parsed.data.assignmentId },
    select: { id: true, courseId: true, course: { select: { teacherId: true } } },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }

  let studentId: string;
  if (user.role === "STUDENT") {
    studentId = user.id;
  } else {
    if (!canManageCourse(user, { teacherId: assignment.course.teacherId })) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (!parsed.data.studentId) {
      return Response.json({ ok: false, error: "Talaba tanlanmagan" }, { status: 400 });
    }
    studentId = parsed.data.studentId;
  }

  const enrolled = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: assignment.courseId, userId: studentId }, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrolled) {
    return Response.json({ ok: false, error: "Talaba bu kursga yozilmagan" }, { status: 403 });
  }

  const existing = await prisma.oralDefense.findUnique({
    where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } },
  });
  if (existing && (existing.status === "REQUESTED" || existing.status === "ACCEPTED")) {
    return Response.json({ ok: false, error: "So'rov allaqachon mavjud" }, { status: 409 });
  }

  const data = {
    assignmentId: assignment.id,
    studentId,
    requestedById: user.id,
    status: "REQUESTED" as const,
    note: parsed.data.note ? parsed.data.note : null,
    scheduledAt: null,
    result: null,
    resultNote: null,
    decidedAt: null,
  };
  const defense = existing
    ? await prisma.oralDefense.update({ where: { id: existing.id }, data })
    : await prisma.oralDefense.create({ data });

  return Response.json({ ok: true, data: { defense } }, { status: 201 });
}
