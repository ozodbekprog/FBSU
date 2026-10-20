import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse, canViewCourse } from "@/components/courses/course-access";
import { hasCapability } from "@/modules/capabilities";
import { recordEvent } from "@/modules/events/record";

const assignableRole = z.enum(["CO_TEACHER", "ASSISTANT", "OBSERVER"]);
const addSchema = z.object({
  userId: z.string().trim().min(1),
  role: assignableRole.default("CO_TEACHER"),
});
const updateSchema = z.object({
  userId: z.string().trim().min(1),
  role: assignableRole,
});
const removeSchema = z.object({
  userId: z.string().trim().min(1),
});

async function findCourse(id: string) {
  return prisma.course.findFirst({ where: { OR: [{ id }, { slug: id }] } });
}

async function ensureLead(course: Awaited<ReturnType<typeof findCourse>>) {
  if (!course) return;
  const lead = await prisma.courseTeacher.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: course.teacherId } },
    select: { id: true, role: true },
  });
  if (!lead) {
    await prisma.courseTeacher
      .create({ data: { courseId: course.id, userId: course.teacherId, role: "LEAD" } })
      .catch(() => {});
    return;
  }
  if (lead.role !== "LEAD") {
    await prisma.courseTeacher.update({ where: { id: lead.id }, data: { role: "LEAD" } });
  }
}

async function assertAssignee(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target || !target.isActive) return { ok: false as const, error: "Foydalanuvchi topilmadi" };
  if (!hasCapability(target.role, "course.grade")) {
    return { ok: false as const, error: "Bu foydalanuvchi o'qituvchi sifatida biriktirila olmaydi" };
  }
  return { ok: true as const, target };
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const course = await findCourse(id);
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: user.id } },
    select: { status: true },
  });
  if (!canViewCourse(user, course, enrollment?.status === "ACTIVE")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (canManageCourse(user, course)) {
    await ensureLead(course);
  }

  const teachers = await prisma.courseTeacher.findMany({
    where: { courseId: course.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return Response.json({ ok: true, data: { teachers } });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const course = await findCourse(id);
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  if (parsed.data.userId === course.teacherId) {
    return Response.json(
      { ok: false, error: "Asosiy o'qituvchi allaqachon biriktirilgan" },
      { status: 409 },
    );
  }

  const assignee = await assertAssignee(parsed.data.userId);
  if (!assignee.ok) {
    return Response.json({ ok: false, error: assignee.error }, { status: 400 });
  }

  const existing = await prisma.courseTeacher.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: parsed.data.userId } },
    select: { id: true, role: true },
  });
  if (existing) {
    return Response.json(
      { ok: false, error: "Bu o'qituvchi allaqachon qo'shilgan" },
      { status: 409 },
    );
  }

  const teacher = await prisma.courseTeacher.create({
    data: {
      courseId: course.id,
      userId: parsed.data.userId,
      role: parsed.data.role,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
  });

  await recordEvent(user.id, "course.teacher.add", {
    entity: "Course",
    entityId: course.id,
    meta: { userId: parsed.data.userId, role: parsed.data.role },
  });

  return Response.json({ ok: true, data: { teacher } }, { status: 201 });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const course = await findCourse(id);
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  if (parsed.data.userId === course.teacherId) {
    return Response.json(
      { ok: false, error: "Asosiy o'qituvchi rolini o'zgartirish mumkin emas" },
      { status: 409 },
    );
  }

  const existing = await prisma.courseTeacher.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: parsed.data.userId } },
    select: { id: true, role: true },
  });
  if (!existing) {
    return Response.json({ ok: false, error: "O'qituvchi topilmadi" }, { status: 404 });
  }

  const teacher = await prisma.courseTeacher.update({
    where: { id: existing.id },
    data: { role: parsed.data.role },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
  });

  await recordEvent(user.id, "course.teacher.update", {
    entity: "Course",
    entityId: course.id,
    meta: { userId: parsed.data.userId, from: existing.role, to: parsed.data.role },
  });

  return Response.json({ ok: true, data: { teacher } });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const course = await findCourse(id);
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  if (parsed.data.userId === course.teacherId) {
    return Response.json(
      { ok: false, error: "Asosiy o'qituvchini o'chirish mumkin emas" },
      { status: 409 },
    );
  }

  const existing = await prisma.courseTeacher.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: parsed.data.userId } },
    select: { id: true, role: true },
  });
  if (!existing) {
    return Response.json({ ok: false, error: "O'qituvchi topilmadi" }, { status: 404 });
  }

  await prisma.courseTeacher.delete({ where: { id: existing.id } });

  await recordEvent(user.id, "course.teacher.remove", {
    entity: "Course",
    entityId: course.id,
    meta: { userId: parsed.data.userId, role: existing.role },
  });

  return Response.json({ ok: true, data: { userId: parsed.data.userId } });
}
