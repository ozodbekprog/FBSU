import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeQuizScore } from "@/lib/quiz-score";
import type { AttendanceStatus, Prisma, Role, SubmissionStatus } from "@prisma/client";
import type { BarChartDatum, DonutChartDatum, LineChartDatum } from "@/components/charts";
import { t as translate, type Dictionary, type Locale } from "@/i18n";

export type AnalyticsScope = {
  facultyId?: string | null;
  departmentId?: string | null;
};

export type GradeTrendPoint = LineChartDatum & {
  detail: {
    title: string;
    course: string;
    kind: "assignment" | "quiz";
    score: number;
    max: number;
    at: string;
    feedback: string | null;
  };
};

export type CourseAttendanceDetail = {
  courseId: string;
  title: string;
  percent: number;
  attended: number;
  total: number;
};

export type AttendanceCounts = {
  present: number;
  late: number;
  excused: number;
  absent: number;
  suspicious: number;
  leftEarly: number;
};

export type PerformanceSeries = {
  weeks: string[];
  assignments: (number | null)[];
  quizzes: (number | null)[];
  attendance: (number | null)[];
  activity: number[];
};

export type StudentAnalytics = {
  attendance: DonutChartDatum[];
  attendanceTotal: number;
  attendanceRate: number | null;
  attendanceCounts: AttendanceCounts;
  courseAttendance: BarChartDatum[];
  courseAttendanceDetail: CourseAttendanceDetail[];
  gradeTrend: GradeTrendPoint[];
  gradeTotal: number;
  performance: PerformanceSeries;
};

export type TeacherAnalytics = {
  kind: "teacher";
  submissionsByDay: BarChartDatum[];
  attendanceByDay: LineChartDatum[];
  studentsByCourse: BarChartDatum[];
  submissionStatus: DonutChartDatum[];
};

export type AdminAnalytics = {
  kind: "admin";
  usersByRole: DonutChartDatum[];
  submissionsByDay: BarChartDatum[];
};

const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "#10b981",
  LATE: "#f59e0b",
  EXCUSED: "#64748b",
  ABSENT: "#f43f5e",
  SUSPICIOUS: "#a855f7",
  LEFT_EARLY: "#f97316",
};

const ATTENDANCE_LABELS: Record<AttendanceStatus, keyof Dictionary> = {
  PRESENT: "dashAttendancePresent",
  LATE: "dashAttendanceLate",
  EXCUSED: "dashAttendanceExcused",
  ABSENT: "dashAttendanceAbsent",
  SUSPICIOUS: "dashAttendanceSuspicious",
  LEFT_EARLY: "dashAttendanceLeftEarly",
};

const SUBMISSION_COLORS: Record<SubmissionStatus, string> = {
  SUBMITTED: "#5373b8",
  GRADED: "#10b981",
  LATE: "#f59e0b",
};

const SUBMISSION_LABELS: Record<SubmissionStatus, keyof Dictionary> = {
  SUBMITTED: "dashSubmitted",
  GRADED: "dashGraded",
  LATE: "dashSubmissionLate",
};

const ROLE_COLORS: Record<Role, string> = {
  STUDENT: "#5373b8",
  TEACHER: "#3f5a9d",
  REGISTRAR: "#31548c",
  BUXGALTER: "#8a6d18",
  TYUTOR: "#2b4b7e",
  KAFEDRA_MUDIRI: "#496da3",
  DEKAN: "#24406f",
  PRO_RECTOR: "#c9a227",
  REKTOR: "#e3c76a",
  ADMIN: "#d4af37",
  OWNER: "#d4af37",
  XODIM: "#64748b",
  OTA_ONA: "#2b4b7e",
  NAZORATCHI: "#64748b",
};

const ROLE_LABELS: Record<Role, keyof Dictionary> = {
  STUDENT: "dashRoleStudents",
  TEACHER: "dashRoleTeachers",
  REGISTRAR: "dashRoleRegistrar",
  BUXGALTER: "payRoleBuxgalter",
  TYUTOR: "dashRoleTutors",
  KAFEDRA_MUDIRI: "dashRoleHeads",
  DEKAN: "dashRoleDeans",
  PRO_RECTOR: "dashRoleProRectors",
  REKTOR: "dashRoleRector",
  ADMIN: "dashRoleAdmins",
  OWNER: "dashRoleAdmins",
  XODIM: "dashRoleStaff",
  OTA_ONA: "dashRoleParents",
  NAZORATCHI: "secNazoratTitle",
};

const ATTENDED: AttendanceStatus[] = ["PRESENT", "LATE"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildWindow(size: number) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: size }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (size - 1 - index));
    return date;
  });
  return { start: days[0], days };
}

function shorten(title: string, max = 18) {
  const trimmed = title.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

function percent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

export async function getStudentAnalytics(
  studentId: string,
  locale: Locale,
): Promise<StudentAnalytics> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: studentId, status: "ACTIVE" },
    select: { course: { select: { id: true, title: true } } },
    orderBy: { course: { title: "asc" } },
  });
  const courseIds = enrollments.map((enrollment) => enrollment.course.id);

  const [records, submissions, attempts] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId, courseId: { in: courseIds } },
      select: { courseId: true, status: true, date: true },
    }),
    prisma.submission.findMany({
      where: {
        studentId,
        status: "GRADED",
        score: { not: null },
        assignment: { courseId: { in: courseIds } },
      },
      select: {
        score: true,
        feedback: true,
        gradedAt: true,
        submittedAt: true,
        assignment: {
          select: {
            title: true,
            maxScore: true,
            course: { select: { title: true } },
          },
        },
      },
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId,
        score: { not: null },
        quiz: { courseId: { in: courseIds } },
      },
      select: {
        score: true,
        finishedAt: true,
        startedAt: true,
        quiz: {
          select: {
            title: true,
            course: { select: { title: true } },
            questions: { select: { points: true } },
          },
        },
      },
    }),
  ]);

  const statusTotals: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    LATE: 0,
    EXCUSED: 0,
    ABSENT: 0,
    SUSPICIOUS: 0,
    LEFT_EARLY: 0,
  };
  const byCourse = new Map<string, AttendanceStatus[]>();
  for (const record of records) {
    statusTotals[record.status] += 1;
    const list = byCourse.get(record.courseId);
    if (list) {
      list.push(record.status);
    } else {
      byCourse.set(record.courseId, [record.status]);
    }
  }

  const attendance: DonutChartDatum[] = (
    ["PRESENT", "LATE", "EXCUSED", "SUSPICIOUS", "ABSENT"] as AttendanceStatus[]
  ).map((status) => ({
    label: translate(locale, ATTENDANCE_LABELS[status]),
    value: statusTotals[status],
    color: ATTENDANCE_COLORS[status],
  }));

  const courseAttendance: BarChartDatum[] = enrollments
    .map((enrollment): BarChartDatum | null => {
      const statuses = byCourse.get(enrollment.course.id) ?? [];
      if (statuses.length === 0) return null;
      const attended = statuses.filter((status) => ATTENDED.includes(status)).length;
      return {
        label: shorten(enrollment.course.title),
        value: percent(attended, statuses.length),
      };
    })
    .filter((item): item is BarChartDatum => item !== null);

  const courseAttendanceDetail: CourseAttendanceDetail[] = enrollments.map((enrollment) => {
    const statuses = byCourse.get(enrollment.course.id) ?? [];
    const attended = statuses.filter((status) => ATTENDED.includes(status)).length;
    return {
      courseId: enrollment.course.id,
      title: enrollment.course.title,
      percent: statuses.length > 0 ? percent(attended, statuses.length) : 0,
      attended,
      total: statuses.length,
    };
  });

  const attendanceCount = records.length;
  const attendedTotal = statusTotals.PRESENT + statusTotals.LATE;

  const points: {
    at: Date;
    value: number;
    title: string;
    course: string;
    kind: "assignment" | "quiz";
    score: number;
    max: number;
    feedback: string | null;
  }[] = [];
  for (const submission of submissions) {
    if (submission.score === null || submission.assignment.maxScore <= 0) continue;
    points.push({
      at: submission.gradedAt ?? submission.submittedAt,
      value: percent(submission.score, submission.assignment.maxScore),
      title: submission.assignment.title,
      course: submission.assignment.course.title,
      kind: "assignment",
      score: submission.score,
      max: submission.assignment.maxScore,
      feedback: submission.feedback,
    });
  }
  for (const attempt of attempts) {
    if (attempt.score === null) continue;
    const maxScore = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
    if (maxScore <= 0) continue;
    const score = normalizeQuizScore(attempt.score, maxScore) ?? 0;
    points.push({
      at: attempt.finishedAt ?? attempt.startedAt,
      value: percent(score, maxScore),
      title: attempt.quiz.title,
      course: attempt.quiz.course.title,
      kind: "quiz",
      score,
      max: maxScore,
      feedback: null,
    });
  }
  points.sort((a, b) => a.at.getTime() - b.at.getTime());

  function weekStartOf(value: Date) {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }
  const currentWeek = weekStartOf(new Date());
  const weekStarts = Array.from({ length: 8 }, (_, index) => {
    const week = new Date(currentWeek);
    week.setDate(week.getDate() - (7 - index) * 7);
    return week;
  });
  const weekKeyOf = (week: Date) => `${week.getFullYear()}-${week.getMonth()}-${week.getDate()}`;
  const weekKeys = weekStarts.map(weekKeyOf);
  const weekIndex = new Map(weekKeys.map((key, index) => [key, index]));
  const assignmentBuckets: number[][] = weekKeys.map(() => []);
  const quizBuckets: number[][] = weekKeys.map(() => []);
  const attendanceBuckets: AttendanceStatus[][] = weekKeys.map(() => []);
  for (const point of points) {
    const index = weekIndex.get(weekKeyOf(weekStartOf(point.at)));
    if (index == null) continue;
    if (point.kind === "assignment") assignmentBuckets[index].push(point.value);
    else quizBuckets[index].push(point.value);
  }
  for (const record of records) {
    const index = weekIndex.get(weekKeyOf(weekStartOf(record.date)));
    if (index == null) continue;
    attendanceBuckets[index].push(record.status);
  }
  const averageOf = (values: number[]) =>
    values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  const attendanceOf = (statuses: AttendanceStatus[]) => {
    if (statuses.length === 0) return null;
    const attended = statuses.filter((status) => ATTENDED.includes(status)).length;
    return Math.round((attended / statuses.length) * 100);
  };
  const performance: PerformanceSeries = {
    weeks: weekStarts.map((week) => {
      const day = String(week.getDate()).padStart(2, "0");
      const month = String(week.getMonth() + 1).padStart(2, "0");
      return `${day}.${month}`;
    }),
    assignments: assignmentBuckets.map(averageOf),
    quizzes: quizBuckets.map(averageOf),
    attendance: attendanceBuckets.map(attendanceOf),
    activity: weekKeys.map(
      (_, index) =>
        assignmentBuckets[index].length + quizBuckets[index].length + attendanceBuckets[index].length,
    ),
  };

  return {
    attendance,
    attendanceTotal: attendanceCount,
    attendanceRate: attendanceCount > 0 ? percent(attendedTotal, attendanceCount) : null,
    attendanceCounts: {
      present: statusTotals.PRESENT,
      late: statusTotals.LATE,
      excused: statusTotals.EXCUSED,
      absent: statusTotals.ABSENT,
      suspicious: statusTotals.SUSPICIOUS,
      leftEarly: statusTotals.LEFT_EARLY,
    },
    courseAttendance,
    courseAttendanceDetail,
    gradeTrend: points.slice(-10).map((point) => ({
      label: dayLabel(point.at),
      value: point.value,
      detail: {
        title: point.title,
        course: point.course,
        kind: point.kind,
        score: point.score,
        max: point.max,
        at: point.at.toISOString(),
        feedback: point.feedback,
      },
    })),
    gradeTotal: points.length,
    performance,
  };
}

export async function getTeacherAnalytics(
  teacherId: string,
  locale: Locale,
): Promise<TeacherAnalytics> {
  const courses = await prisma.course.findMany({
    where: { teacherId },
    select: { id: true, title: true, _count: { select: { enrollments: true } } },
    orderBy: { title: "asc" },
  });
  const courseIds = courses.map((course) => course.id);
  const { start, days } = buildWindow(14);

  const [submissions, records, statusGroups] = await Promise.all([
    prisma.submission.findMany({
      where: { assignment: { courseId: { in: courseIds } }, submittedAt: { gte: start } },
      select: { submittedAt: true },
    }),
    prisma.attendance.findMany({
      where: { courseId: { in: courseIds }, date: { gte: start } },
      select: { date: true, status: true },
    }),
    prisma.submission.groupBy({
      by: ["status"],
      where: { assignment: { courseId: { in: courseIds } } },
      _count: { _all: true },
    }),
  ]);

  const submissionBuckets = new Map<string, number>();
  for (const submission of submissions) {
    const key = dayKey(submission.submittedAt);
    submissionBuckets.set(key, (submissionBuckets.get(key) ?? 0) + 1);
  }
  const submissionsByDay: BarChartDatum[] = days.map((date) => ({
    label: dayLabel(date),
    value: submissionBuckets.get(dayKey(date)) ?? 0,
  }));

  const attendanceBuckets = new Map<string, { attended: number; total: number }>();
  for (const record of records) {
    const key = dayKey(record.date);
    const bucket = attendanceBuckets.get(key) ?? { attended: 0, total: 0 };
    bucket.total += 1;
    if (ATTENDED.includes(record.status)) bucket.attended += 1;
    attendanceBuckets.set(key, bucket);
  }
  const attendanceByDay: LineChartDatum[] = days
    .map((date): LineChartDatum | null => {
      const bucket = attendanceBuckets.get(dayKey(date));
      if (!bucket || bucket.total === 0) return null;
      return { label: dayLabel(date), value: percent(bucket.attended, bucket.total) };
    })
    .filter((item): item is LineChartDatum => item !== null);

  const studentsByCourse: BarChartDatum[] = courses
    .map((course) => ({
      label: shorten(course.title),
      value: course._count.enrollments,
    }))
    .filter((item) => item.value > 0);

  const countByStatus = new Map<SubmissionStatus, number>(
    statusGroups.map((row): [SubmissionStatus, number] => [row.status, row._count._all]),
  );
  const submissionStatus: DonutChartDatum[] = (
    ["SUBMITTED", "GRADED", "LATE"] as SubmissionStatus[]
  ).map((status) => ({
    label: translate(locale, SUBMISSION_LABELS[status]),
    value: countByStatus.get(status) ?? 0,
    color: SUBMISSION_COLORS[status],
  }));

  return { kind: "teacher", submissionsByDay, attendanceByDay, studentsByCourse, submissionStatus };
}

export async function getAdminAnalytics(locale: Locale, scope?: AnalyticsScope): Promise<AdminAnalytics> {
  const { start, days } = buildWindow(14);
  const facultyScope = scope?.facultyId ?? null;
  const departmentScope = scope?.departmentId ?? null;

  const userWhere: Prisma.UserWhereInput = facultyScope
    ? { facultyId: facultyScope }
    : departmentScope
      ? {
          OR: [
            { departmentId: departmentScope },
            {
              role: "STUDENT",
              enrollments: {
                some: { status: "ACTIVE", course: { teacher: { departmentId: departmentScope } } },
              },
            },
          ],
        }
      : {};
  const submissionWhere: Prisma.SubmissionWhereInput = facultyScope
    ? { student: { facultyId: facultyScope } }
    : departmentScope
      ? { assignment: { course: { teacher: { departmentId: departmentScope } } } }
      : {};

  const [roleCounts, submissions] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: userWhere, _count: { _all: true } }),
    prisma.submission.findMany({
      where: { submittedAt: { gte: start }, ...submissionWhere },
      select: { submittedAt: true },
    }),
  ]);

  const countByRole = new Map<Role, number>(
    roleCounts.map((row): [Role, number] => [row.role, row._count._all]),
  );
  const usersByRole: DonutChartDatum[] = (["STUDENT", "TEACHER", "ADMIN"] as Role[]).map((role) => ({
    label: translate(locale, ROLE_LABELS[role]),
    value: countByRole.get(role) ?? 0,
    color: ROLE_COLORS[role],
  }));

  const buckets = new Map<string, number>();
  for (const submission of submissions) {
    const key = dayKey(submission.submittedAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const submissionsByDay: BarChartDatum[] = days.map((date) => ({
    label: dayLabel(date),
    value: buckets.get(dayKey(date)) ?? 0,
  }));

  return { kind: "admin", usersByRole, submissionsByDay };
}
