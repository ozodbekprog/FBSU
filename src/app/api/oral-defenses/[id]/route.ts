import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const patchSchema = z.object({
  action: z.enum(["accept", "decline", "done", "cancel"]),
  scheduledAt: z.string().trim().nullable().optional(),
  result: z.enum(["PASSED", "FAILED"]).optional(),
  resultNote: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const defense = await prisma.oralDefense.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      studentId: true,
      assignment: { select: { course: { select: { teacherId: true } } } },
    },
  });
  if (!defense) {
    return Response.json({ ok: false, error: "So'rov topilmadi" }, { status: 404 });
  }

  const isManager = canManageCourse(user, { teacherId: defense.assignment.course.teacherId });
  const isOwner = defense.studentId === user.id;
  const action = parsed.data.action;

  if (action === "cancel") {
    if (!isOwner && !isManager) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (defense.status !== "REQUESTED" && defense.status !== "ACCEPTED") {
      return Response.json({ ok: false, error: "Bu so'rovni bekor qilib bo'lmaydi" }, { status: 409 });
    }
    const updated = await prisma.oralDefense.update({
      where: { id },
      data: { status: "CANCELLED", decidedAt: new Date() },
    });
    return Response.json({ ok: true, data: { defense: updated } });
  }

  if (!isManager) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (action === "accept") {
    if (defense.status !== "REQUESTED") {
      return Response.json({ ok: false, error: "So'rov holati mos emas" }, { status: 409 });
    }
    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    if (parsed.data.scheduledAt && Number.isNaN(scheduledAt?.getTime())) {
      return Response.json({ ok: false, error: "Sana noto'g'ri" }, { status: 400 });
    }
    const updated = await prisma.oralDefense.update({
      where: { id },
      data: { status: "ACCEPTED", scheduledAt, decidedAt: new Date() },
    });
    return Response.json({ ok: true, data: { defense: updated } });
  }

  if (action === "decline") {
    if (defense.status !== "REQUESTED" && defense.status !== "ACCEPTED") {
      return Response.json({ ok: false, error: "So'rov holati mos emas" }, { status: 409 });
    }
    const updated = await prisma.oralDefense.update({
      where: { id },
      data: { status: "DECLINED", decidedAt: new Date() },
    });
    return Response.json({ ok: true, data: { defense: updated } });
  }

  if (!parsed.data.result) {
    return Response.json({ ok: false, error: "Natija tanlanmagan" }, { status: 400 });
  }
  if (defense.status !== "ACCEPTED") {
    return Response.json({ ok: false, error: "Avval so'rovni qabul qiling" }, { status: 409 });
  }
  const updated = await prisma.oralDefense.update({
    where: { id },
    data: {
      status: "DONE",
      result: parsed.data.result,
      resultNote: parsed.data.resultNote ? parsed.data.resultNote : null,
      decidedAt: new Date(),
    },
  });
  return Response.json({ ok: true, data: { defense: updated } });
}
