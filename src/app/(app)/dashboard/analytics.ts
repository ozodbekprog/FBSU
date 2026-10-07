import "server-only";
import { prisma } from "@/lib/prisma";
import type { AttendanceStatus, Prisma, Role, SubmissionStatus } from "@prisma/client";
import type { BarChartDatum, DonutChartDatum, LineChartDatum } from "@/components/charts";
import { t as translate, type Dictionary, type Locale } from "@/i18n";

export type AnalyticsScope = {
  facultyId?: string | null;
  departmentId?: string | null;
};

export type StudentAnalytics = {
  attendance: DonutChartDatum[];
  attendanceTotal: number;
  courseAttendance: BarChartDatum[];
  gradeTrend: LineChartDatum[];
  gradeTotal: number;
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
  TEACHER: "#34497f",
  REGISTRAR: "#0284c7",
  TYUTOR: "#059669",
  KAFEDRA_MUDIRI: "#0ea5e9",
  DEKAN: "#7c3aed",
  PRO_RECTOR: "#ca8a04",
  REKTOR: "#c9a227",
  ADMIN: "#e11d48",
  XODIM: "#64748b",
};

const ROLE_LABELS: Record<Role, keyof Dictionary> = {
  STUDENT: "dashRoleStudents",
  TEACHER: "dashRoleTeachers",
  REGISTRAR: "dashRoleRegistrar",
  TYUTOR: "dashRoleTutors",
  KAFEDRA_MUDIRI: "dashRoleHeads",
  DEKAN: "dashRoleDeans",
  PRO_RECTOR: "dashRoleProRectors",
  REKTOR: "dashRoleRector",
  ADMIN: "dashRoleAdmins",
  XODIM: "dashRoleStaff",
};

const ATTENDED: AttendanceStatus[] = ["PRESENT", "LATE", "EXCUSED", "SUSPICIOUS"];

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
      select: { courseId: true, status: true },
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
        gradedAt: true,
        submittedAt: true,
        assignment: { select: { maxScore: true } },
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
        quiz: { select: { questions: { select: { points: true } } } },
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

  const points: { at: Date; value: number }[] = [];
  for (const submission of submissions) {
    if (submission.score === null || submission.assignment.maxScore <= 0) continue;
    points.push({
      at: submission.gradedAt ?? submission.submittedAt,
      value: percent(submission.score, submission.assignment.maxScore),
    });
  }
  for (const attempt of attempts) {
    if (attempt.score === null) continue;
    const maxScore = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
    if (maxScore <= 0) continue;
    points.push({
      at: attempt.finishedAt ?? attempt.startedAt,
      value: percent(attempt.score, maxScore),
    });
  }
  points.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    attendance,
    attendanceTotal: records.length,
    courseAttendance,
    gradeTrend: points.slice(-10).map((point) => ({
      label: dayLabel(point.at),
      value: point.value,
    })),
    gradeTotal: points.length,
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
