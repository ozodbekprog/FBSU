import "server-only";
import { prisma } from "@/lib/prisma";

export const GPA_CREDITS = 6;

/**
 * O'qituvchi bonus ballari chegarasi (4.0 shkalasi).
 * Saqlashda butun songa ×10 ishlatiladi: 0.6 → 6, 4.0 → 40.
 */
export const BONUS_MIN_TENTHS = 6;
export const BONUS_MAX_TENTHS = 40;

export type GpaLetter = "A" | "B" | "C" | "D" | "F";

export type BonusPointRecord = {
  courseId: string;
  courseTitle: string;
  points: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
};

export type GpaCourse = {
  courseId: string;
  title: string;
  slug: string;
  percent: number;
  points: number;
  letter: GpaLetter;
  credits: number;
  gradedCount: number;
  bonusPoints: number;
  bonuses: BonusPointRecord[];
};

export type StudentGpa = {
  studentId: string;
  gpa: number | null;
  totalCredits: number;
  qualityPoints: number;
  overallPercent: number | null;
  gradedCount: number;
  totalBonusPoints: number;
  courses: GpaCourse[];
};

export function gpaPoints(percent: number): number {
  if (percent >= 90) return 4;
  if (percent >= 85) return 3.7;
  if (percent >= 80) return 3.3;
  if (percent >= 75) return 3;
  if (percent >= 70) return 2.7;
  if (percent >= 65) return 2.3;
  if (percent >= 60) return 2;
  return 0;
}

export function letterGrade(percent: number): GpaLetter {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

type CourseTotals = { score: number; max: number; gradedCount: number };

export async function getStudentGpa(
  studentId: string,
  courseIds?: string[],
): Promise<StudentGpa> {
  const [submissions, attempts, bonuses] = await Promise.all([
    prisma.submission.findMany({
      where: {
        studentId,
        status: "GRADED",
        score: { not: null },
        ...(courseIds ? { assignment: { courseId: { in: courseIds } } } : {}),
      },
      select: {
        score: true,
        assignment: { select: { courseId: true, maxScore: true } },
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId,
        finishedAt: { not: null },
        score: { not: null },
        ...(courseIds ? { quiz: { courseId: { in: courseIds } } } : {}),
      },
      select: {
        score: true,
        quiz: { select: { courseId: true, questions: { select: { points: true } } } },
      },
    }),
    prisma.bonusPoint.findMany({
      where: {
        studentId,
        ...(courseIds ? { courseId: { in: courseIds } } : {}),
      },
      select: {
        courseId: true,
        tenths: true,
        reason: true,
        createdAt: true,
        awardedBy: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totals = new Map<string, CourseTotals>();
  const bonusByCourse = new Map<string, number>();
  const bonusRecords = new Map<string, BonusPointRecord[]>();

  function add(courseId: string, score: number, max: number) {
    if (max <= 0) return;
    const current = totals.get(courseId) ?? { score: 0, max: 0, gradedCount: 0 };
    current.score += score;
    current.max += max;
    current.gradedCount += 1;
    totals.set(courseId, current);
  }

  for (const submission of submissions) {
    add(submission.assignment.courseId, submission.score ?? 0, submission.assignment.maxScore);
  }

  for (const attempt of attempts) {
    const quizMax = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
    add(attempt.quiz.courseId, attempt.score ?? 0, quizMax);
  }

  // Bonus ballar o'z fani bo'yicha, o'quvchining umumiy bonusiga qo'shiladi.
  for (const bonus of bonuses) {
    const value = bonus.tenths / 10;
    bonusByCourse.set(bonus.courseId, (bonusByCourse.get(bonus.courseId) ?? 0) + value);
    const list = bonusRecords.get(bonus.courseId) ?? [];
    list.push({
      courseId: bonus.courseId,
      courseTitle: bonus.course.title,
      points: value,
      reason: bonus.reason,
      awardedByName: bonus.awardedBy.name,
      createdAt: bonus.createdAt.toISOString(),
    });
    bonusRecords.set(bonus.courseId, list);
  }

  // Faqat baholangan yoki bonus olgan kurslar GPA hisobiga kiradi.
  for (const courseId of bonusByCourse.keys()) {
    if (!totals.has(courseId)) {
      totals.set(courseId, { score: 0, max: 0, gradedCount: 0 });
    }
  }

  if (totals.size === 0) {
    return {
      studentId,
      gpa: null,
      totalCredits: 0,
      qualityPoints: 0,
      overallPercent: null,
      gradedCount: 0,
      totalBonusPoints: 0,
      courses: [],
    };
  }

  const records = await prisma.course.findMany({
    where: {
      id: { in: [...totals.keys()] },
      enrollments: { some: { userId: studentId, status: "ACTIVE" } },
    },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });

  const courses: GpaCourse[] = [];
  let qualityPoints = 0;
  let totalCredits = 0;
  let overallScore = 0;
  let overallMax = 0;
  let gradedCount = 0;
  let totalBonusPoints = 0;

  for (const record of records) {
    const total = totals.get(record.id);
    if (!total) continue;
    const bonus = bonusByCourse.get(record.id) ?? 0;
    totalBonusPoints += bonus;

    // Faqat topshiriq/test bo'lgan kurs foiz o'lchoviga kiradi; bonus o'zi yetarli.
    if (total.max <= 0) {
      const percent = Math.min(Math.round(bonus * 10), 100);
      courses.push({
        courseId: record.id,
        title: record.title,
        slug: record.slug,
        percent,
        points: gpaPoints(percent),
        letter: letterGrade(percent),
        credits: GPA_CREDITS,
        gradedCount: 0,
        bonusPoints: bonus,
        bonuses: bonusRecords.get(record.id) ?? [],
      });
      continue;
    }

    // Bonus ballar 100-ballik foiz ustiga qo'shiladi (4.0 ball ≈ 40 foiz).
    const rawPercent = (total.score / total.max) * 100 + bonus * 10;
    const percent = Math.min(Math.round(rawPercent), 100);
    const points = gpaPoints(percent);
    qualityPoints += points * GPA_CREDITS;
    totalCredits += GPA_CREDITS;
    overallScore += total.score;
    overallMax += total.max;
    gradedCount += total.gradedCount;
    courses.push({
      courseId: record.id,
      title: record.title,
      slug: record.slug,
      percent,
      points,
      letter: letterGrade(percent),
      credits: GPA_CREDITS,
      gradedCount: total.gradedCount,
      bonusPoints: bonus,
      bonuses: bonusRecords.get(record.id) ?? [],
    });
  }

  const gpa = totalCredits > 0 ? Math.round((qualityPoints / totalCredits) * 100) / 100 : null;
  const overallPercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : null;

  return {
    studentId,
    gpa,
    totalCredits,
    qualityPoints: Math.round(qualityPoints * 100) / 100,
    overallPercent,
    gradedCount,
    totalBonusPoints: Math.round(totalBonusPoints * 100) / 100,
    courses,
  };
}
