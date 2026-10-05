import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { notifyUser } from "@/server/notify";
import { logAudit } from "@/server/audit";
import { needsApproval } from "@/modules/grades/regrade";

const gradeSchema = z.object({
  score: z.coerce.number().int().min(0),
  feedback: z.string().trim().max(5000).nullable().optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { assignment: { include: { course: true } } },
  });
  if (!submission) {
    return Response.json({ ok: false, error: "Topshiriq javobi topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, submission.assignment.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  if (parsed.data.score > submission.assignment.maxScore) {
    return Response.json(
      { ok: false, error: `Ball 0 dan ${submission.assignment.maxScore} gacha bo'lishi kerak` },
      { status: 400 },
    );
  }

  const nextScore = parsed.data.score;
  const nextFeedback = parsed.data.feedback || null;

  if (needsApproval(user.role, submission, nextScore)) {
    const reason = (parsed.data.reason ?? "").trim();
    if (reason.length < 5) {
      return Response.json(
        { ok: false, error: "Bahoni o'zgartirish uchun sabab kiritilishi shart (kamida 5 belgi)" },
        { status: 400 },
      );
    }

    const existing = await prisma.gradeChangeRequest.findFirst({
      where: { submissionId: id, status: "PENDING" },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { ok: false, error: "Bu baho uchun allaqachon tasdiq kutilmoqda" },
        { status: 409 },
      );
    }

    const changeRequest = await prisma.gradeChangeRequest.create({
      data: {
        submissionId: id,
        requestedById: user.id,
        oldScore: submission.score,
        newScore: nextScore,
        oldFeedback: submission.feedback,
        newFeedback: nextFeedback,
        reason,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "submission.regrade_request",
      entity: "GradeChangeRequest",
      entityId: changeRequest.id,
      meta: {
        submissionId: id,
        studentId: submission.studentId,
        from: submission.score,
        to: nextScore,
        reason,
      },
    });

    return Response.json(
      { ok: true, data: { pending: true, request: changeRequest } },
      { status: 201 },
    );
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      score: nextScore,
      feedback: nextFeedback,
      status: "GRADED",
      gradedAt: new Date(),
    },
  });

  try {
    await notifyUser(submission.studentId, {
      title: `Topshiriq baholandi: ${submission.assignment.title} — ${nextScore} ball`,
      link: `/courses/${submission.assignment.course.slug}/assignments/${submission.assignmentId}`,
    });
  } catch {}

  await logAudit({
    actorId: user.id,
    action: "submission.grade",
    entity: "Submission",
    entityId: updated.id,
    meta: {
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      score: nextScore,
      maxScore: submission.assignment.maxScore,
      previousScore: submission.score,
      reason: parsed.data.reason ?? null,
    },
  });

  return Response.json({ ok: true, data: updated });
}
