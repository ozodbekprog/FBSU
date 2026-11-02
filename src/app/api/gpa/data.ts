import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeQuizScore } from "@/lib/quiz-score";

/** Har bir fan 30 ballik: 18 ball (60%) — o'tish chegarasi. */
export const COURSE_POINTS_MAX = 30;
export const COURSE_POINTS_PASS = 18;

/** Bir semestrda talaba ko'pi bilan 30 kredit oladi. */
export const SEMESTER_CREDIT_LIMIT = 30;

/** Bakalavr diplomi uchun jami 240 kredit (4 yil × 2 semestr × 30). */
export const DEGREE_CREDIT_TOTAL = 240;

/**
 * O'qituvchi bonus ballari chegarasi (butun ball).
 * Saqlashda butun son ×10 ishlatiladi: 1 → 10, 4 → 40.
 */
export const BONUS_MIN_TENTHS = 10;
export const BONUS_MAX_TENTHS = 40;

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
  /** 30 ballik shkala bo'yicha to'plangan ball. */
  points30: number;
  /** 18 balldan o'tganmi — kredit shundagina beriladi. */
  passed: boolean;
  points: number;
  letter: GpaLetter;
  /** Fanning kredit qiymati. */
  credits: number;
  /** O'tilganda olingan kredit, aks holda 0. */
  earnedCredits: number;
  gradedCount: number;
  bonusPoints: number;
  bonuses: BonusPointRecord[];
};

export type StudentGpa = {
  studentId: string;
  gpa: number | null;
  /** Baholangan fanlarning jami kredit qiymati. */
  attemptedCredits: number;
  /** O'tilgan fanlardan toplangan kredit. */
  earnedCredits: number;
  /** Joriy semestrda yozilgan fanlar krediti (30 dan oshmasligi kerak). */
  semesterPlannedCredits: number;
  semesterEarnedCredits: number;
  semesterCreditLimit: number;
  degreeCreditsRequired: number;
  degreePercent: number;
  qualityPoints: number;
  overallPercent: number | null;
  gradedCount: number;
  totalBonusPoints: number;
  courses: GpaCourse[];
};

/** Talabaga o'qituvchi bergan fan bo'yicha bonus. */
export type BonusGrantView = {
  id: string;
  courseId: string;
  courseTitle: string;
  points: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
};

export type StudentBonusOverview = {
  grants: BonusGrantView[];
  totalPoints: number;
};

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** 30 ballik natijani bir xonali aniqlikda yaxlitlaydi. */
function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Fan natijasi 30 ballik shkalada: xom ball foizi shkalaga o'giriladi va
 * o'qituvchi bonus ballari (butun ball) shu shkalaga qo'shiladi.
 * Natija 0–30 oralig'ida, bir xonali aniqlikda.
 */
export function coursePoints30(score: number, max: number, bonusPoints: number) {
  if (max <= 0) return null;
  const base = (score / max) * COURSE_POINTS_MAX;
  return roundOne(Math.min(COURSE_POINTS_MAX, Math.max(0, base + bonusPoints)));
}

/** 30 ballik natijadan foiz (0–100). */
export function points30Percent(points30: number) {
  return clampPercent((points30 / COURSE_POINTS_MAX) * 100);
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

/** 18 ball — fan bo'yicha o'tish chegarasi (30 dan). */
export function isCoursePassed(percent: number) {
  return percent >= 60;
}

type CourseTotals = { score: number; max: number; gradedCount: number };

export async function getStudentGpa(
  studentId: string,
  courseIds?: string[],
): Promise<StudentGpa> {
  const [submissions, attempts, bonuses, enrollments] = await Promise.all([
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
        courseId: { not: null },
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
    prisma.enrollment.findMany({
      where: {
        userId: studentId,
        status: "ACTIVE",
        ...(courseIds ? { courseId: { in: courseIds } } : {}),
      },
      select: { courseId: true, course: { select: { credits: true } } },
    }),
  ]);

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

  for (const bonus of bonuses) {
    if (!bonus.courseId || !bonus.course) continue;
    bonusTenthsByCourse.set(
      bonus.courseId,
      (bonusTenthsByCourse.get(bonus.courseId) ?? 0) + bonus.tenths,
    );
    const list = bonusRecords.get(bonus.courseId) ?? [];
    list.push({
      courseId: bonus.courseId,
      courseTitle: bonus.course.title,
      points: bonus.tenths / 10,
      reason: bonus.reason,
      awardedByName: bonus.awardedBy.name,
      createdAt: bonus.createdAt.toISOString(),
    });
    bonusRecords.set(bonus.courseId, list);
  }

  const semesterPlannedCredits = enrollments.reduce(
    (sum, enrollment) => sum + enrollment.course.credits,
    0,
  );

  const empty = (): StudentGpa => ({
    studentId,
    gpa: null,
    attemptedCredits: 0,
    earnedCredits: 0,
    semesterPlannedCredits,
    semesterEarnedCredits: 0,
    semesterCreditLimit: SEMESTER_CREDIT_LIMIT,
    degreeCreditsRequired: DEGREE_CREDIT_TOTAL,
    degreePercent: 0,
    qualityPoints: 0,
    overallPercent: null,
    gradedCount: 0,
    totalBonusPoints: 0,
    courses: [],
  });

  if (totals.size === 0) return empty();

  const records = await prisma.course.findMany({
    where: {
      id: { in: [...totals.keys()] },
      enrollments: { some: { userId: studentId, status: "ACTIVE" } },
    },
    select: { id: true, title: true, slug: true, credits: true },
    orderBy: { title: "asc" },
  });

  const courses: GpaCourse[] = [];
  let qualityPoints = 0;
  let attemptedCredits = 0;
  let earnedCredits = 0;
  let points30CreditSum = 0;
  let points30CreditMax = 0;
  let gradedCount = 0;
  let totalBonusPoints = 0;

  for (const record of records) {
    const total = totals.get(record.id);
    if (!total) continue;
    const bonusPoints = (bonusTenthsByCourse.get(record.id) ?? 0) / 10;
    totalBonusPoints += bonusPoints;

    // Baholanmagan fanga qo'shilgan ballar baholar paydo bo'lgach hisobga olinadi.
    if (total.max <= 0) continue;

    const points30 = coursePoints30(total.score, total.max, bonusPoints);
    if (points30 === null) continue;
    const percent = points30Percent(points30);
    const points = gpaPoints(percent);
    const credits = Math.max(1, record.credits);
    const passed = points30 >= COURSE_POINTS_PASS;

    // GPA fan krediti bilan tortiladi; kredit faqat 18 balldan o'tganda beriladi.
    qualityPoints += points * credits;
    attemptedCredits += credits;
    if (passed) earnedCredits += credits;
    points30CreditSum += points30 * credits;
    points30CreditMax += COURSE_POINTS_MAX * credits;
    gradedCount += total.gradedCount;

    courses.push({
      courseId: record.id,
      title: record.title,
      slug: record.slug,
      percent,
      points30,
      passed,
      points,
      letter: letterGrade(percent),
      credits,
      earnedCredits: passed ? credits : 0,
      gradedCount: total.gradedCount,
      bonusPoints,
      bonuses: bonusRecords.get(record.id) ?? [],
    });
  }

  if (courses.length === 0) return empty();

  const gpa = attemptedCredits > 0 ? roundTwo(qualityPoints / attemptedCredits) : null;
  const overallPercent =
    points30CreditMax > 0
      ? clampPercent((points30CreditSum / points30CreditMax) * 100)
      : null;

  return {
    studentId,
    gpa,
    attemptedCredits,
    earnedCredits,
    semesterPlannedCredits,
    semesterEarnedCredits: earnedCredits,
    semesterCreditLimit: SEMESTER_CREDIT_LIMIT,
    degreeCreditsRequired: DEGREE_CREDIT_TOTAL,
    degreePercent: Math.min(100, Math.round((earnedCredits / DEGREE_CREDIT_TOTAL) * 100)),
    qualityPoints: Math.round(qualityPoints * 100) / 100,
    overallPercent,
    gradedCount,
    totalBonusPoints: Math.round(totalBonusPoints * 100) / 100,
    courses,
  };
}

/**
 * Talabaning bonus tarixi: faqat o'qituvchi fan doirasida bergan ballar.
 */
export async function getStudentBonusOverview(studentId: string): Promise<StudentBonusOverview> {
  const bonuses = await prisma.bonusPoint.findMany({
    where: { studentId, courseId: { not: null } },
    select: {
      id: true,
      courseId: true,
      tenths: true,
      reason: true,
      createdAt: true,
      awardedBy: { select: { name: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grants: BonusGrantView[] = [];
  for (const bonus of bonuses) {
    if (!bonus.courseId || !bonus.course) continue;
    grants.push({
      id: bonus.id,
      courseId: bonus.courseId,
      courseTitle: bonus.course.title,
      points: bonus.tenths / 10,
      reason: bonus.reason,
      awardedByName: bonus.awardedBy.name,
      createdAt: bonus.createdAt.toISOString(),
    });
  }

  return {
    grants,
    totalPoints: Math.round(grants.reduce((sum, grant) => sum + grant.points, 0) * 10) / 10,
  };
}
