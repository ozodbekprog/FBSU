import "server-only";
import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asAnswers, autoScore, toQuestionFull } from "@/components/quiz/shared";
import { EXAM_CODE_MAX_RETRIES } from "@/modules/secure-exam/config";
import { generateExamCode, isValidExamCode, normalizeExamCode } from "@/modules/secure-exam/code";
import { isEnrolled, saveAttemptAnswers } from "@/components/quiz/server";
import { hasCapability } from "@/modules/capabilities";
import { EVENT_LABEL_KEY } from "@/components/secure-exam/labels";
import { uz } from "@/i18n/uz";
import { effectiveDeadline, remainingSeconds } from "@/modules/secure-exam/policy";
import type { SecureEventType } from "@/modules/secure-exam/events";
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
  if (!hasCapability(user.role, "exams.manage")) return false;
  if (user.role === "ADMIN") return true;
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
    await saveAttemptAnswers(db, run.attempt.id, questions, answers, now);
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
  face?: RunState["face"];
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
    face: input.face,
  };
}

export function secureEventLabel(type: string): string {
  if (type in EVENT_LABEL_KEY) {
    return uz[EVENT_LABEL_KEY[type as SecureEventType]];
  }
  return type;
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

export type SecureJoinInspection =
  | { kind: "RESUME"; runId: string }
  | {
      kind: "READY";
      exam: {
        id: string;
        title: string;
        quizTitle: string;
        durationMin: number | null;
        requireFullscreen: boolean;
        blockCopy: boolean;
        webcamEnabled: boolean;
        maxWarnings: number;
      };
    }
  | { kind: "ERROR"; status: number; message: string; quizId?: string };

export async function inspectSecureJoin(
  user: { id: string; role: Role },
  rawCode: string,
): Promise<SecureJoinInspection> {
  if (user.role !== "STUDENT") {
    return { kind: "ERROR", status: 403, message: "Faqat talaba imtihonga kira oladi" };
  }
  const code = normalizeExamCode(rawCode);
  if (!isValidExamCode(code)) {
    return { kind: "ERROR", status: 404, message: "Bunday kodli imtihon topilmadi" };
  }

  const exam = await prisma.secureExam.findUnique({
    where: { code },
    include: {
      quiz: {
        select: { id: true, title: true, isPublished: true, maxAttempts: true, timeLimitMin: true },
      },
    },
  });
  if (!exam) {
    return { kind: "ERROR", status: 404, message: "Bunday kodli imtihon topilmadi" };
  }
  if (exam.status === "CLOSED") {
    return { kind: "ERROR", status: 400, message: "Imtihon yopilgan" };
  }
  const now = new Date();
  if (now.getTime() < exam.startsAt.getTime()) {
    return { kind: "ERROR", status: 400, message: "Imtihon hali boshlanmagan" };
  }
  if (now.getTime() > exam.endsAt.getTime()) {
    return { kind: "ERROR", status: 400, message: "Imtihon vaqti tugagan" };
  }
  if (!exam.quiz.isPublished) {
    return { kind: "ERROR", status: 400, message: "Test hali chop etilmagan" };
  }

  const existingRun = await prisma.secureExamRun.findUnique({
    where: { examId_studentId: { examId: exam.id, studentId: user.id } },
    include: { attempt: { select: { finishedAt: true } } },
  });
  if (existingRun) {
    if (existingRun.attempt.finishedAt) {
      return {
        kind: "ERROR",
        status: 409,
        message: "Siz bu imtihonni allaqachon topshirgansiz",
        quizId: exam.quizId,
      };
    }
    return { kind: "RESUME", runId: existingRun.id };
  }

  if (!(await isEnrolled(exam.courseId, user.id))) {
    return { kind: "ERROR", status: 403, message: "Kursga yozilmagansiz" };
  }

  const finishedAttempts = await prisma.quizAttempt.count({
    where: { quizId: exam.quizId, studentId: user.id, finishedAt: { not: null } },
  });
  if (finishedAttempts >= exam.quiz.maxAttempts) {
    return {
      kind: "ERROR",
      status: 409,
      message: "Urinishlar soni tugagan",
      quizId: exam.quizId,
    };
  }

  return {
    kind: "READY",
    exam: {
      id: exam.id,
      title: exam.title,
      quizTitle: exam.quiz.title,
      durationMin: exam.durationMin ?? exam.quiz.timeLimitMin,
      requireFullscreen: exam.requireFullscreen,
      blockCopy: exam.blockCopy,
      webcamEnabled: exam.webcamEnabled,
      maxWarnings: exam.maxWarnings,
    },
  };
}
