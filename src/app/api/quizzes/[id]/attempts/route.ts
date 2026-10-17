import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEnrolled, publicError } from "@/components/quiz/server";
import {
  decideStart,
  isAttemptExpired,
  type AttemptSummary,
} from "@/modules/quiz/attempt-machine";
import { attendanceCounts } from "@/app/api/attendance/summary/data";
import { toQuestionFull, toQuestionPublic, type QuestionFull } from "@/components/quiz/shared";
import { assertActivityOpen } from "@/modules/course-rules/server";

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}

function orderKey(questions: QuestionFull[]): string {
  return questions.map((question) => question.id).join("|");
}

function shuffledQuestions(questions: QuestionFull[], seed: string): QuestionFull[] {
  return shuffleWith(questions, randomFromSeed(hashSeed(seed)));
}

function orderedQuestions(
  questions: QuestionFull[],
  history: Array<{ id: string }>,
): QuestionFull[] {
  if (questions.length < 2) return questions;
  let previousKey: string | null = null;
  let current = questions;
  for (const attempt of history) {
    let salt = 0;
    let candidate = shuffledQuestions(questions, attempt.id);
    while (previousKey !== null && orderKey(candidate) === previousKey && salt < 32) {
      salt += 1;
      candidate = shuffledQuestions(questions, `${attempt.id}#${salt}`);
    }
    previousKey = orderKey(candidate);
    current = candidate;
  }
  return current;
}

function shuffledOptions(question: QuestionFull, attemptId: string): QuestionFull {
  if (question.type !== "SINGLE" && question.type !== "MULTIPLE") return question;
  if (question.options.length < 2) return question;
  const order = shuffleWith(
    question.options.map((_, index) => index),
    randomFromSeed(hashSeed(`${attemptId}:${question.id}`)),
  );
  const positions = new Map(order.map((original, position) => [original, position]));
  return {
    ...question,
    options: order.map((original) => question.options[original]),
    correct: question.correct
      .filter((original): original is number => typeof original === "number")
      .map((original) => positions.get(original))
      .filter((position): position is number => position !== undefined),
  };
}

function attemptPayload(
  attempt: { id: string; startedAt: Date; finishedAt: Date | null },
  quiz: {
    id: string;
    title: string;
    timeLimitMin: number | null;
    maxAttempts: number;
    questions: Array<Parameters<typeof toQuestionFull>[0]>;
  },
  history: Array<{ id: string }>,
) {
  const ordered = orderedQuestions(quiz.questions.map(toQuestionFull), history);
  return {
    attempt: { id: attempt.id, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt },
    quiz: {
      id: quiz.id,
      title: quiz.title,
      timeLimitMin: quiz.timeLimitMin,
      maxAttempts: quiz.maxAttempts,
    },
    questions: ordered.map((question) => toQuestionPublic(shuffledOptions(question, attempt.id))),
  };
}

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Faqat talaba test boshlashi mumkin" }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (!quiz || !quiz.isPublished) {
      return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });
    }
    if (!(await isEnrolled(quiz.courseId, user.id))) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const gate = await assertActivityOpen("QUIZ", id);
    if (!gate.ok) return Response.json({ ok: false, error: gate.error }, { status: 403 });

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const attempts = await tx.quizAttempt.findMany({
        where: { quizId: id, studentId: user.id },
        orderBy: { startedAt: "asc" },
      });

      const settled: AttemptSummary[] = [];
      for (const attempt of attempts) {
        if (isAttemptExpired(attempt, quiz.timeLimitMin, now)) {
          const finishedAt = new Date(
            attempt.startedAt.getTime() + (quiz.timeLimitMin ?? 0) * 60_000,
          );
          await tx.quizAttempt.update({ where: { id: attempt.id }, data: { finishedAt } });
          settled.push({ id: attempt.id, startedAt: attempt.startedAt, finishedAt });
        } else {
          settled.push({
            id: attempt.id,
            startedAt: attempt.startedAt,
            finishedAt: attempt.finishedAt,
          });
        }
      }

      const decision = decideStart(settled, quiz.maxAttempts);
      if (decision.action === "resume") {
        const active = settled.find((attempt) => attempt.id === decision.attemptId);
        if (active) return { kind: "active" as const, attempt: active };
      }
      if (decision.action === "blocked") {
        return { kind: "limit" as const };
      }

      if (quiz.dueAt && quiz.dueAt.getTime() < now.getTime()) {
        return { kind: "due" as const };
      }

      const attendanceRecords = await tx.attendance.findMany({
        where: { courseId: quiz.courseId, studentId: user.id },
        select: { status: true },
      });
      const attendance = attendanceCounts(attendanceRecords.map((record) => record.status));
      if (!attendance.eligible) return { kind: "attendance" as const };

      const attempt = await tx.quizAttempt.create({
        data: { quizId: id, studentId: user.id },
      });
      return { kind: "created" as const, attempt };
    });

    if (result.kind === "due") {
      return Response.json({ ok: false, error: "Test muddati tugagan" }, { status: 400 });
    }
    if (result.kind === "attendance") {
      return Response.json(
        { ok: false, error: "Imtihonga ruxsat yo'q (davomat past)" },
        { status: 403 },
      );
    }
    if (result.kind === "limit") {
      return Response.json({ ok: false, error: "Urinishlar soni tugagan" }, { status: 409 });
    }

    const history = await prisma.quizAttempt.findMany({
      where: { quizId: id, studentId: user.id },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });

    if (result.kind === "active") {
      return Response.json({ ok: true, data: attemptPayload(result.attempt, quiz, history) });
    }
    return Response.json(
      { ok: true, data: attemptPayload(result.attempt, quiz, history) },
      { status: 201 },
    );
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
