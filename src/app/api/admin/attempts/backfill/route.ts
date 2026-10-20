import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { publicError, saveAttemptAnswers } from "@/components/quiz/server";
import { asAnswers, toQuestionFull } from "@/components/quiz/shared";
import { recordEvent } from "@/modules/events/record";

const bodySchema = z.object({
  dryRun: z.boolean().optional(),
  quizId: z.string().trim().min(1).optional(),
});

const BATCH_SIZE = 100;

export async function POST(request: Request) {
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "system.admin")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  try {
    const scope = {
      finishedAt: { not: null },
      ...(parsed.data.quizId ? { quizId: parsed.data.quizId } : {}),
    };
    const total = await prisma.quizAttempt.count({ where: scope });
    if (parsed.data.dryRun) {
      return Response.json({
        ok: true,
        data: { dryRun: true, total, processed: 0, rows: 0 },
      });
    }

    let cursor: string | undefined;
    let processed = 0;
    let rows = 0;

    while (true) {
      const attempts = await prisma.quizAttempt.findMany({
        where: scope,
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          answers: true,
          finishedAt: true,
          quiz: {
            select: {
              questions: { orderBy: { position: "asc" } },
            },
          },
        },
      });
      if (attempts.length === 0) break;

      for (const attempt of attempts) {
        const questions = attempt.quiz.questions.map(toQuestionFull);
        const answers = asAnswers(attempt.answers);
        const written = await prisma.$transaction((tx) =>
          saveAttemptAnswers(
            tx,
            attempt.id,
            questions,
            answers,
            attempt.finishedAt ?? new Date(),
          ),
        );
        rows += written;
        processed += 1;
      }

      cursor = attempts[attempts.length - 1].id;
    }

    await recordEvent(user.id, "attempt.backfill", {
      entity: "QuizAttempt",
      meta: { quizId: parsed.data.quizId ?? null, total, processed, rows },
    });

    return Response.json({
      ok: true,
      data: { dryRun: false, total, processed, rows },
    });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
