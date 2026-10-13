import "server-only";
import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asAnswers, autoScore, toQuestionFull } from "@/components/quiz/shared";
import { EXAM_CODE_MAX_RETRIES } from "@/modules/secure-exam/config";
import { generateExamCode } from "@/modules/secure-exam/code";
import { effectiveDeadline, remainingSeconds } from "@/modules/secure-exam/policy";
import type { LimitAction, RunState, RunStatus } from "@/modules/secure-exam/types";

export type Db = Prisma.TransactionClient | PrismaClient;

export async function generateUniqueExamCode(db: Db): Promise<string> {
  for (let attempt = 0; attempt < EXAM_CODE_MAX_RETRIES; attempt += 1) {
    const code = generateExamCode();
    const existing = await db.secureExam.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("Imtihon kodini generatsiya qilib bo'lmadi");
}

export function canManageSecureExam(
  exam: { createdById: string; courseTeacherId: string },
  user: { id: string; role: Role },
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  return exam.createdById === user.id || exam.courseTeacherId === user.id;
}

export async function finalizeRun(
  db: Db,
  runId: string,
  status: Extract<RunStatus, "SUBMITTED" | "TERMINATED">,
  now: Date,
): Promise<void> {
  const run = await db.secureExamRun.findUnique({
    where: { id: runId },
    include: {
      attempt: {
        include: { quiz: { include: { questions: { orderBy: { position: "asc" } } } } },
      },
    },
  });
  if (!run) return;
  if (!run.attempt.finishedAt) {
    const questions = run.attempt.quiz.questions.map(toQuestionFull);
    const answers = asAnswers(run.attempt.answers);
    await db.quizAttempt.update({
      where: { id: run.attempt.id },
      data: { answers, score: autoScore(questions, answers), finishedAt: now },
    });
  }
  await db.secureExamRun.update({
    where: { id: runId },
    data: { status, finishedAt: now },
  });
}

export function buildRunState(input: {
  status: RunStatus;
  warnings: number;
  maxWarnings: number;
  limitAction: LimitAction;
  startedAt: Date;
  finishedAt: Date | null;
  durationMin: number | null;
  sittingEndsAt: Date;
  extraMin: number;
  now: Date;
}): RunState {
  const deadline = effectiveDeadline({
    startedAt: input.startedAt,
    durationMin: input.durationMin,
    sittingEndsAt: input.sittingEndsAt,
    extraMin: input.extraMin,
  });
  const finished = input.finishedAt !== null;
  return {
    status: input.status,
    finished,
    warnings: input.warnings,
    maxWarnings: input.maxWarnings,
    limitAction: input.limitAction,
    endsAt: deadline ? deadline.toISOString() : null,
    serverNow: input.now.toISOString(),
    timeLeftSec: finished ? 0 : remainingSeconds(deadline, input.now),
  };
}

export async function findRunForStaff(runId: string, user: { id: string; role: Role }) {
  const run = await prisma.secureExamRun.findUnique({
    where: { id: runId },
    include: {
      exam: { include: { course: { select: { teacherId: true } } } },
    },
  });
  if (!run) return null;
  const manageable = canManageSecureExam(
    { createdById: run.exam.createdById, courseTeacherId: run.exam.course.teacherId },
    user,
  );
  return manageable ? run : null;
}
