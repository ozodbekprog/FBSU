import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { publicError, saveAttemptAnswers } from "@/components/quiz/server";
import { asAnswers, autoScore, toQuestionFull } from "@/components/quiz/shared";
import { recordEvent } from "@/modules/events/record";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyCsrfFromRequest(_request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        course: true,
        questions: { orderBy: { position: "asc" } },
      },
    });
    if (!quiz) return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });
    if (!canManageCourse(user, quiz.course)) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const questions = quiz.questions.map(toQuestionFull);
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id, finishedAt: { not: null } },
      select: { id: true, answers: true, finishedAt: true, manualScore: true, score: true },
    });

    let regraded = 0;
    let manualSkipped = 0;

    for (const attempt of attempts) {
      const answers = asAnswers(attempt.answers);
      const auto = autoScore(questions, answers);
      await prisma.$transaction(async (tx) => {
        await saveAttemptAnswers(
          tx,
          attempt.id,
          questions,
          answers,
          attempt.finishedAt ?? new Date(),
        );
        const differsFromAuto = attempt.score !== null && attempt.score !== auto;
        if (attempt.manualScore || differsFromAuto) {
          if (!attempt.manualScore && differsFromAuto) {
            await tx.quizAttempt.update({
              where: { id: attempt.id },
              data: { manualScore: true },
            });
          }
          manualSkipped += 1;
          return;
        }
        await tx.quizAttempt.update({ where: { id: attempt.id }, data: { score: auto } });
        regraded += 1;
      });
    }

    await recordEvent(user.id, "quiz.regrade", {
      entity: "Quiz",
      entityId: quiz.id,
      meta: { attempts: attempts.length, regraded, manualSkipped },
    });

    return Response.json({
      ok: true,
      data: { attempts: attempts.length, regraded, manualSkipped },
    });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
