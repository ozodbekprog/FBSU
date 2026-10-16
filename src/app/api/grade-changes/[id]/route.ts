import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/modules/capabilities";
import { notifyUser } from "@/server/notify";
import { logAudit } from "@/server/audit";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasCapability(user.role, "gradeChanges.review")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Amal noto'g'ri" }, { status: 400 });
  }

  const { id } = await params;
  const changeRequest = await prisma.gradeChangeRequest.findUnique({
    where: { id },
    include: {
      submission: {
        select: {
          id: true,
          studentId: true,
          assignmentId: true,
          assignment: {
            select: {
              title: true,
              maxScore: true,
              course: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
  if (!changeRequest) {
    return Response.json({ ok: false, error: "So'rov topilmadi" }, { status: 404 });
  }
  if (changeRequest.status !== "PENDING") {
    return Response.json({ ok: false, error: "Bu so'rov allaqachon ko'rib chiqilgan" }, { status: 409 });
  }

  const link = `/courses/${changeRequest.submission.assignment.course.slug}/assignments/${changeRequest.submission.assignmentId}`;

  if (parsed.data.action === "approve") {
    if (
      changeRequest.newScore !== null &&
      changeRequest.newScore > changeRequest.submission.assignment.maxScore
    ) {
      return Response.json(
        { ok: false, error: `Ball maksimal ${changeRequest.submission.assignment.maxScore} dan oshib ketdi` },
        { status: 400 },
      );
    }

    const [updatedRequest] = await prisma.$transaction([
      prisma.gradeChangeRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
      }),
      prisma.submission.update({
        where: { id: changeRequest.submissionId },
        data: {
          score: changeRequest.newScore,
          feedback: changeRequest.newFeedback,
          status: "GRADED",
          gradedAt: new Date(),
        },
      }),
    ]);

    try {
      await notifyUser(changeRequest.requestedById, {
        title: `Baho tuzatishingiz tasdiqlandi: ${changeRequest.submission.assignment.title} — ${changeRequest.newScore} ball`,
        link,
      });
      await notifyUser(changeRequest.submission.studentId, {
        title: `Baho tuzatildi: ${changeRequest.submission.assignment.title} — ${changeRequest.newScore} ball`,
        link,
      });
    } catch {}

    await logAudit({
      actorId: user.id,
      action: "grade_change.approve",
      entity: "GradeChangeRequest",
      entityId: id,
      meta: {
        submissionId: changeRequest.submissionId,
        studentId: changeRequest.submission.studentId,
        from: changeRequest.oldScore,
        to: changeRequest.newScore,
      },
    });

    return Response.json({ ok: true, data: updatedRequest });
  }

  const rejected = await prisma.gradeChangeRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date() },
  });

  try {
    await notifyUser(changeRequest.requestedById, {
      title: `Baho tuzatish so'rovingiz rad etildi: ${changeRequest.submission.assignment.title}`,
      link,
    });
  } catch {}

  await logAudit({
    actorId: user.id,
    action: "grade_change.reject",
    entity: "GradeChangeRequest",
    entityId: id,
    meta: {
      submissionId: changeRequest.submissionId,
      studentId: changeRequest.submission.studentId,
      from: changeRequest.oldScore,
      to: changeRequest.newScore,
    },
  });

  return Response.json({ ok: true, data: rejected });
}
