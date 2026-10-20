import { prisma } from "@/lib/prisma";
import type { Course, Prisma, Question, Quiz, Role } from "@prisma/client";
import { asAnswers, autoScore, type QuestionFull } from "@/components/quiz/shared";
import { canGradeCourse, canManageCourse } from "@/components/courses/course-access";

export type StaffUser = { id: string; role: Role };

export const ATTEMPT_GRACE_MS = 60_000;

export function expiredAttemptDeadline(
  startedAt: Date,
  timeLimitMin: number | null,
  now: Date = new Date(),
): Date | null {
  if (timeLimitMin === null) return null;
  const deadline = new Date(startedAt.getTime() + timeLimitMin * 60_000);
  return now.getTime() > deadline.getTime() + ATTEMPT_GRACE_MS ? deadline : null;
}

export async function closeExpiredAttempt(
  db: Prisma.TransactionClient,
  attemptId: string,
  storedAnswers: unknown,
  questions: QuestionFull[],
  deadline: Date,
) {
  return db.quizAttempt.update({
    where: { id: attemptId },
    data: { score: autoScore(questions, asAnswers(storedAnswers)), finishedAt: deadline },
  });
}

export async function findManageableQuiz(quizId: string, user: StaffUser): Promise<(Quiz & { course: Course }) | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });
  if (!quiz) return null;
  if (canManageCourse(user, quiz.course)) return quiz;
  return null;
}

export async function findGradableQuiz(quizId: string, user: StaffUser): Promise<(Quiz & { course: Course }) | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });
  if (!quiz) return null;
  if (canGradeCourse(user, quiz.course)) return quiz;
  return null;
}

export async function findManageableQuestion(
  questionId: string,
  user: StaffUser,
): Promise<(Question & { quiz: Quiz & { course: Course } }) | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { quiz: { include: { course: true } } },
  });
  if (!question) return null;
  if (canManageCourse(user, question.quiz.course)) return question;
  return null;
}

export async function isEnrolled(courseId: string, userId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { status: true },
  });
  return enrollment?.status === "ACTIVE";
}

export function isStaffRole(role: Role): boolean {
  return role === "ADMIN" || role === "TEACHER";
}

export function publicError(error: unknown): string {
  console.error(error);
  return "Xatolik yuz berdi";
}
