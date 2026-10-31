import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeQuizScore } from "@/lib/quiz-score";

export const GPA_CREDITS = 6;

/**
 * O'qituvchi bonus ballari chegarasi (butun ball).
 * Saqlashda butun son ×10 ishlatiladi: 1 → 10, 4 → 40.
 */
export const BONUS_MIN_TENTHS = 10;
export const BONUS_MAX_TENTHS = 40;

/**
 * Rektor istalgan talabaga chegarasiz, kamida 1 butun ball beradi.
 * Ball fan foiziga emas, fanning umumiy balliga qo'shiladi.
 */
export const BONUS_RECTOR_MIN_TENTHS = 10;

/** Ball faqat butun son bo'ladi: 1 ball = 10 o'nlik birlik. */
export const BONUS_WHOLE_STEP_TENTHS = 10;
/** Faqat texnik himoya: Int ustuni chegarasidan oshib ketmaslik uchun. */
export const BONUS_TENTHS_LIMIT = 2_000_000_000;

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
  /** VIP kredit — yakuniy GPA ga bevosita qo'shilgan qiymat. */
  creditBoost: number;
  courses: GpaCourse[];
};

export type BonusAllocationView = {
  id: string;
  courseId: string;
  courseTitle: string;
  points: number;
};

/** Talaba bonus hamyonidagi bitta yozuv (rektor bergan yoki o'qituvchi fanga bergan). */
export type BonusGrantView = {
  id: string;
  courseId: string | null;
  courseTitle: string | null;
  totalTenths: number;
  allocatedTenths: number;
  remainingTenths: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
  allocations: BonusAllocationView[];
};

export type BonusTargetView = {
  courseId: string;
  title: string;
  slug: string;
  /** Joriy foiz (bonus ballar umumiy ballga qo'shilgan holda); baho yo'q bo'lsa null. */
  percent: number | null;
  /** Baholangan ishlar yig'indisi (ball). */
  score: number | null;
  /** Baholangan ishlarning maksimal balli. */
  maxScore: number | null;
  appliedTenths: number;
  headroomTenths: number;
};

export type StudentBonusOverview = {
  grants: BonusGrantView[];
  targets: BonusTargetView[];
  walletTenths: number;
  appliedTenths: number;
  totalAwardedTenths: number;
};

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Bonus ball — fan foiziga emas, fanning umumiy balliga qo'shiladi:
 * (toplangan ball + bonus ball) / maksimal ball × 100.
 */
function coursePercent(score: number, max: number, bonusTenths: number) {
  if (max <= 0) return null;
  return clampPercent(((score + bonusTenths / 10) / max) * 100);
}

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
  const [submissions, attempts, bonuses, creditTotals] = await Promise.all([
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
        ...(courseIds
          ? {
              OR: [
                { courseId: { in: courseIds } },
                { allocations: { some: { courseId: { in: courseIds } } } },
              ],
            }
          : {}),
      },
      select: {
        courseId: true,
        tenths: true,
        reason: true,
        createdAt: true,
        awardedBy: { select: { name: true } },
        course: { select: { title: true } },
        allocations: {
          select: {
            tenths: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.creditAward.aggregate({
      where: { studentId },
      _sum: { credits: true },
    }),
  ]);

  const creditBoost = roundTwo(creditTotals._sum.credits ?? 0);

  const totals = new Map<string, CourseTotals>();
  const bonusTenthsByCourse = new Map<string, number>();
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
    add(attempt.quiz.courseId, normalizeQuizScore(attempt.score, quizMax) ?? 0, quizMax);
  }

  // Bonus ballar fani bo'yicha qo'shiladi: o'qituvchi balli to'g'ridan-to'g'ri,
  // rektor balli esa talaba tanlagan fanlarga taqsimlangan qismi bilan.
  for (const bonus of bonuses) {
    const apply = (courseId: string, courseTitle: string, tenths: number) => {
      bonusTenthsByCourse.set(courseId, (bonusTenthsByCourse.get(courseId) ?? 0) + tenths);
      const list = bonusRecords.get(courseId) ?? [];
      list.push({
        courseId,
        courseTitle,
        points: tenths / 10,
        reason: bonus.reason,
        awardedByName: bonus.awardedBy.name,
        createdAt: bonus.createdAt.toISOString(),
      });
      bonusRecords.set(courseId, list);
    };

    if (bonus.courseId && bonus.course) {
      apply(bonus.courseId, bonus.course.title, bonus.tenths);
    }
    for (const allocation of bonus.allocations) {
      apply(allocation.courseId, allocation.course.title, allocation.tenths);
    }
  }

  // Bonus olgan, lekin hali baholanmagan kurslar ham ro'yxatga tushadi;
  // GPA hisobiga esa faqat baholangan ishlari bor kurslar kiradi.
  for (const courseId of bonusTenthsByCourse.keys()) {
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
      creditBoost,
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
  let overallBonusTenths = 0;
  let gradedCount = 0;
  let totalBonusPoints = 0;

  for (const record of records) {
    const total = totals.get(record.id);
    if (!total) continue;
    const bonusTenths = bonusTenthsByCourse.get(record.id) ?? 0;
    totalBonusPoints += bonusTenths / 10;

    // Baholanmagan fanga qo'shilgan ballar baholar paydo bo'lgach hisobga olinadi.
    if (total.max <= 0) continue;

    const percent = coursePercent(total.score, total.max, bonusTenths) ?? 0;
    const points = gpaPoints(percent);
    qualityPoints += points * GPA_CREDITS;
    totalCredits += GPA_CREDITS;
    overallScore += total.score;
    overallMax += total.max;
    overallBonusTenths += bonusTenths;
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
      bonusPoints: bonusTenths / 10,
      bonuses: bonusRecords.get(record.id) ?? [],
    });
  }

  // VIP kredit yakuniy GPA ga qo'shiladi; 4.0 — shkalaning yuqori chegarasi.
  const baseGpa = totalCredits > 0 ? qualityPoints / totalCredits : null;
  const gpa = baseGpa == null ? null : Math.min(roundTwo(baseGpa + creditBoost), 4);
  const overallPercent =
    overallMax > 0
      ? clampPercent(((overallScore + overallBonusTenths / 10) / overallMax) * 100)
      : null;

  return {
    studentId,
    gpa,
    totalCredits,
    qualityPoints: Math.round(qualityPoints * 100) / 100,
    overallPercent,
    gradedCount,
    totalBonusPoints: Math.round(totalBonusPoints * 100) / 100,
    creditBoost,
    courses,
  };
}

/**
 * Talabaning bonus hamyoni: olingan grantlar, ishlatilmagan qoldiq va
 * bonus ishlatish mumkin bo'lgan fanlar (joriy foiz + 100% gacha joy).
 */
export async function getStudentBonusOverview(studentId: string): Promise<StudentBonusOverview> {
  const [bonuses, enrollments, submissions, attempts] = await Promise.all([
    prisma.bonusPoint.findMany({
      where: { studentId },
      select: {
        id: true,
        courseId: true,
        tenths: true,
        reason: true,
        createdAt: true,
        awardedBy: { select: { name: true } },
        course: { select: { title: true } },
        allocations: {
          select: {
            id: true,
            tenths: true,
            courseId: true,
            course: { select: { title: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { userId: studentId, status: "ACTIVE" },
      select: { course: { select: { id: true, title: true, slug: true } } },
      orderBy: { course: { title: "asc" } },
    }),
    prisma.submission.findMany({
      where: { studentId, status: "GRADED", score: { not: null } },
      select: {
        score: true,
        assignment: { select: { courseId: true, maxScore: true } },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { studentId, finishedAt: { not: null }, score: { not: null } },
      select: {
        score: true,
        quiz: { select: { courseId: true, questions: { select: { points: true } } } },
      },
    }),
  ]);

  const totals = new Map<string, { score: number; max: number }>();
  const addTotal = (courseId: string, score: number, max: number) => {
    if (max <= 0) return;
    const current = totals.get(courseId) ?? { score: 0, max: 0 };
    current.score += score;
    current.max += max;
    totals.set(courseId, current);
  };

  for (const submission of submissions) {
    addTotal(submission.assignment.courseId, submission.score ?? 0, submission.assignment.maxScore);
  }
  for (const attempt of attempts) {
    const quizMax = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
    addTotal(attempt.quiz.courseId, attempt.score ?? 0, quizMax);
  }

  const appliedByCourse = new Map<string, number>();
  let walletTenths = 0;
  let appliedTenths = 0;
  let totalAwardedTenths = 0;

  const grants: BonusGrantView[] = bonuses.map((bonus) => {
    totalAwardedTenths += bonus.tenths;

    if (bonus.courseId && bonus.course) {
      appliedTenths += bonus.tenths;
      appliedByCourse.set(
        bonus.courseId,
        (appliedByCourse.get(bonus.courseId) ?? 0) + bonus.tenths,
      );
      return {
        id: bonus.id,
        courseId: bonus.courseId,
        courseTitle: bonus.course.title,
        totalTenths: bonus.tenths,
        allocatedTenths: bonus.tenths,
        remainingTenths: 0,
        reason: bonus.reason,
        awardedByName: bonus.awardedBy.name,
        createdAt: bonus.createdAt.toISOString(),
        allocations: [],
      };
    }

    const allocatedTenths = bonus.allocations.reduce(
      (sum, allocation) => sum + allocation.tenths,
      0,
    );
    const remainingTenths = Math.max(0, bonus.tenths - allocatedTenths);
    walletTenths += remainingTenths;
    appliedTenths += allocatedTenths;
    for (const allocation of bonus.allocations) {
      appliedByCourse.set(
        allocation.courseId,
        (appliedByCourse.get(allocation.courseId) ?? 0) + allocation.tenths,
      );
    }

    return {
      id: bonus.id,
      courseId: null,
      courseTitle: null,
      totalTenths: bonus.tenths,
      allocatedTenths,
      remainingTenths,
      reason: bonus.reason,
      awardedByName: bonus.awardedBy.name,
      createdAt: bonus.createdAt.toISOString(),
      allocations: bonus.allocations.map((allocation) => ({
        id: allocation.id,
        courseId: allocation.courseId,
        courseTitle: allocation.course.title,
        points: allocation.tenths / 10,
      })),
    };
  });

  const targets: BonusTargetView[] = enrollments.map(({ course }) => {
    const total = totals.get(course.id);
    const bonusTenths = appliedByCourse.get(course.id) ?? 0;
    const max = total?.max ?? 0;
    const score = total?.score ?? 0;
    const isGraded = max > 0;

    return {
      courseId: course.id,
      title: course.title,
      slug: course.slug,
      percent: coursePercent(score, max, bonusTenths),
      score: isGraded ? score : null,
      maxScore: isGraded ? max : null,
      appliedTenths: bonusTenths,
      // Bonus fanning umumiy ballidan joy oladi; baho yo'q bo'lsa joy noma'lum.
      headroomTenths: isGraded
        ? Math.max(0, Math.floor(max * 10 - score * 10 - bonusTenths))
        : 0,
    };
  });

  return {
    grants,
    targets,
    walletTenths,
    appliedTenths,
    totalAwardedTenths,
  };
}

/** Bitta fanga yana necha foiz bonus sig'ishini hisoblaydi (100% chegarasi bilan). */
export async function getCourseBonusHeadroom(studentId: string, courseId: string) {
  const [submissions, attempts, bound, allocated] = await Promise.all([
    prisma.submission.findMany({
      where: {
        studentId,
        status: "GRADED",
        score: { not: null },
        assignment: { courseId },
      },
      select: { score: true, assignment: { select: { maxScore: true } } },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId,
        finishedAt: { not: null },
        score: { not: null },
        quiz: { courseId },
      },
      select: {
        score: true,
        quiz: { select: { questions: { select: { points: true } } } },
      },
    }),
    prisma.bonusPoint.aggregate({
      where: { studentId, courseId },
      _sum: { tenths: true },
    }),
    prisma.bonusAllocation.aggregate({
      where: { courseId, bonusPoint: { studentId } },
      _sum: { tenths: true },
    }),
  ]);

  let score = 0;
  let max = 0;
  for (const submission of submissions) {
    max += submission.assignment.maxScore;
    score += submission.score ?? 0;
  }
  for (const attempt of attempts) {
    const quizMax = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
    if (quizMax <= 0) continue;
    max += quizMax;
    score += attempt.score ?? 0;
  }

  const appliedTenths = (bound._sum.tenths ?? 0) + (allocated._sum.tenths ?? 0);
  const percent = coursePercent(score, max, appliedTenths) ?? 0;

  return {
    percent,
    appliedTenths,
    score,
    maxScore: max,
    // Ball fanning umumiy ballidan joy oladi, foizdan emas.
    headroomTenths:
      max > 0 ? Math.max(0, Math.floor(max * 10 - score * 10 - appliedTenths)) : 0,
  };
}
