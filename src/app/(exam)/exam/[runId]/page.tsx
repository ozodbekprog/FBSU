import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RunRoom } from "@/components/secure-exam/run-room";
import {
  asAnswers,
  toQuestionFull,
  toQuestionPublic,
  type QuestionFull,
} from "@/components/quiz/shared";
import {
  optionSeed,
  permutedOptions,
  remapAnswersToDisplay,
  shuffledQuestions,
} from "@/modules/secure-exam/order";
import { effectiveDeadline } from "@/modules/secure-exam/policy";
import { finalizeRun } from "@/server/secure-exam";

export const metadata: Metadata = {
  title: "Xavfsiz imtihon",
  robots: { index: false, follow: false },
};

export default async function SecureRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const user = await requireUser();
  const { runId } = await params;
  if (user.role !== "STUDENT") redirect("/secure-exams");

  const run = await prisma.secureExamRun.findUnique({
    where: { id: runId },
    include: {
      exam: {
        include: {
          course: { select: { title: true } },
          quiz: { include: { questions: { orderBy: { position: "asc" } } } },
        },
      },
      attempt: true,
    },
  });
  if (!run || run.studentId !== user.id) notFound();
  if (run.attempt.finishedAt) redirect(`/quizzes/${run.exam.quizId}/results`);

  const fullQuestions: QuestionFull[] = run.exam.quiz.questions.map(toQuestionFull);
  const ordered = shuffledQuestions(fullQuestions.map(toQuestionPublic), run.attemptId);
  const questions = ordered.map((question) => ({
    ...question,
    options:
      question.type === "MATCHING" || question.type === "ORDERING"
        ? question.options
        : permutedOptions(question.options, optionSeed(run.attemptId, question.id)),
  }));


  const durationMin = run.exam.durationMin ?? run.exam.quiz.timeLimitMin;
  const deadline = effectiveDeadline({
    startedAt: run.startedAt,
    durationMin,
    sittingEndsAt: run.exam.endsAt,
    extraMin: run.extraMin,
  });

  if (deadline && Date.now() >= deadline.getTime()) {
    await prisma.$transaction(async (tx) => {
      await tx.secureExamEvent.create({
        data: {
          runId: run.id,
          type: "TIMEOUT",
          severity: "INFO",
          meta: { reason: "reopen_after_deadline" },
        },
      });
      await finalizeRun(tx, run.id, "SUBMITTED", new Date());
    });
    redirect(`/quizzes/${run.exam.quizId}/results`);
  }

  const initialAnswers = remapAnswersToDisplay(
    asAnswers(run.attempt.answers),
    fullQuestions,
    run.attemptId,
  );

  return (
    <RunRoom
      runId={run.id}
      quizId={run.exam.quizId}
      title={run.exam.title}
      courseTitle={run.exam.course.title}
      questions={questions}
      endsAt={deadline ? deadline.toISOString() : null}
      initialAnswers={initialAnswers}
      initialWarnings={run.warnings}
      settings={{
        requireFullscreen: run.exam.requireFullscreen,
        blockCopy: run.exam.blockCopy,
        webcamEnabled: run.exam.webcamEnabled,
        maxWarnings: run.exam.maxWarnings,
        limitAction: run.exam.limitAction,
      }}
    />
  );
}
