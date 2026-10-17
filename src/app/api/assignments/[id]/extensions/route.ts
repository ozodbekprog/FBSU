import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const saveSchema = z.object({
  studentId: z.string().trim().min(1),
  extendedDueAt: z.string().trim().min(1),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, assignment.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: assignment.courseId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const extensions = await prisma.assignmentExtension.findMany({ where: { assignmentId: id } });

  return Response.json({
    ok: true,
    data: {
      students: enrollments.map((enrollment) => ({
        id: enrollment.user.id,
        name: enrollment.user.name,
      })),
      extensions: extensions.map((extension) => ({
        id: extension.id,
        studentId: extension.studentId,
        extendedDueAt: extension.extendedDueAt,
      })),
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, assignment.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const extendedDueAt = new Date(parsed.data.extendedDueAt);
  if (Number.isNaN(extendedDueAt.getTime())) {
    return Response.json({ ok: false, error: "Sana formati xato" }, { status: 400 });
  }

  const enrolled = await prisma.enrollment.findUnique({
    where: {
      courseId_userId: { courseId: assignment.courseId, userId: parsed.data.studentId },
    },
    select: { id: true },
  });
  if (!enrolled) {
    return Response.json({ ok: false, error: "Talaba bu kursda emas" }, { status: 400 });
  }

  const extension = await prisma.assignmentExtension.upsert({
    where: {
      assignmentId_studentId: { assignmentId: id, studentId: parsed.data.studentId },
    },
    create: {
      assignmentId: id,
      studentId: parsed.data.studentId,
      extendedDueAt,
    },
    update: { extendedDueAt },
  });

  const iso = extendedDueAt.toISOString();
  await recordEvent(user.id, "assignment.extension", {
    entity: "Assignment",
    entityId: id,
    meta: { studentId: parsed.data.studentId, extendedDueAt: iso },
  });

  return Response.json({ ok: true, data: extension });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, assignment.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const studentId = new URL(request.url).searchParams.get("studentId")?.trim();
  if (!studentId) {
    return Response.json({ ok: false, error: "Talaba tanlanmagan" }, { status: 400 });
  }

  await prisma.assignmentExtension.deleteMany({ where: { assignmentId: id, studentId } });

  return Response.json({ ok: true, data: { deleted: true } });
}
