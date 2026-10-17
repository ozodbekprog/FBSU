import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";
import { collectAutoScores, type AutoSyncItem } from "@/modules/gradebook/auto-sync";

const syncSchema = z.object({
  courseId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  return syncCourse(user.id, course.id);
}

async function syncCourse(userId: string, courseId: string) {
  const items = await prisma.gradeItem.findMany({
    where: { courseId, source: { in: ["ASSIGNMENT", "QUIZ"] }, refId: { not: null } },
    select: { id: true, source: true, refId: true, maxScore: true },
  });

  const syncItems: AutoSyncItem[] = items.map((item) => ({
    id: item.id,
    source: item.source === "QUIZ" ? "QUIZ" : "ASSIGNMENT",
    refId: item.refId as string,
    maxScore: item.maxScore,
  }));

  const assignmentRefIds = syncItems.filter((item) => item.source === "ASSIGNMENT").map((item) => item.refId);
  const quizRefIds = syncItems.filter((item) => item.source === "QUIZ").map((item) => item.refId);

  const submissions =
    assignmentRefIds.length > 0
      ? await prisma.submission.findMany({
          where: { assignmentId: { in: assignmentRefIds } },
          select: { assignmentId: true, studentId: true, score: true },
        })
      : [];

  const attempts =
    quizRefIds.length > 0
      ? await prisma.quizAttempt.findMany({
          where: { quizId: { in: quizRefIds }, finishedAt: { not: null } },
          select: { quizId: true, studentId: true, score: true },
        })
      : [];

  const scores = collectAutoScores(syncItems, submissions, attempts);

  await Promise.all(
    scores.map((entry) =>
      prisma.gradeItemScore.upsert({
        where: { itemId_studentId: { itemId: entry.itemId, studentId: entry.studentId } },
        create: { itemId: entry.itemId, studentId: entry.studentId, score: entry.score },
        update: { score: entry.score },
      }),
    ),
  );

  await recordEvent(userId, "gradebook.sync", {
    entity: "Course",
    entityId: courseId,
    meta: { synced: scores.length },
  });

  return Response.json({ ok: true, data: { synced: scores.length } });
}
