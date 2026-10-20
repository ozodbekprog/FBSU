import "server-only";
import { Badge, Table } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { computeFinalGrades } from "@/modules/gradebook/compute";

export type CourseActivityStudent = {
  id: string;
  name: string;
  group: string | null;
  submitted: number;
  assignmentTotal: number;
  quizAttempts: number;
  quizAverage: number | null;
  attendanceRate: number | null;
  attendanceRecords: number;
  completedMaterials: number;
  materialTotal: number;
  finalPercent: number | null;
};

export type CourseActivityReport = {
  course: { id: string; title: string; slug: string };
  students: CourseActivityStudent[];
  summary: {
    studentCount: number;
    attendanceAverage: number | null;
    finalAverage: number | null;
  };
};

type CourseRef = { id: string; title: string; slug: string };

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function buildCourseActivityReport(course: CourseRef): Promise<CourseActivityReport> {
  const [enrollments, assignments, submissions, quizzes, attendance, materials, categories, items] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: course.id, status: "ACTIVE" },
        select: {
          user: { select: { id: true, name: true, group: { select: { name: true } } } },
        },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.assignment.findMany({ where: { courseId: course.id }, select: { id: true } }),
      prisma.submission.findMany({
        where: { assignment: { courseId: course.id } },
        select: { studentId: true, assignmentId: true },
      }),
      prisma.quiz.findMany({
        where: { courseId: course.id },
        select: {
          id: true,
          questions: { select: { points: true } },
          attempts: { select: { studentId: true, score: true, finishedAt: true } },
        },
      }),
      prisma.attendance.findMany({
        where: { courseId: course.id },
        select: { studentId: true, status: true },
      }),
      prisma.material.findMany({
        where: { section: { courseId: course.id } },
        select: { id: true },
      }),
      prisma.gradeCategory.findMany({
        where: { courseId: course.id },
        select: { id: true, name: true, weight: true },
      }),
      prisma.gradeItem.findMany({
        where: { courseId: course.id },
        select: { id: true, categoryId: true, name: true, weight: true, maxScore: true },
      }),
    ]);

  const materialIds = materials.map((material) => material.id);
  const completions =
    materialIds.length > 0
      ? await prisma.activityCompletion.findMany({
          where: { targetType: "MATERIAL", targetId: { in: materialIds } },
          select: { studentId: true, targetId: true },
        })
      : [];

  const scores =
    items.length > 0
      ? await prisma.gradeItemScore.findMany({
          where: { itemId: { in: items.map((item) => item.id) } },
          select: { itemId: true, studentId: true, score: true },
        })
      : [];

  const studentIds = enrollments.map((enrollment) => enrollment.user.id);
  const finalMap = new Map(
    computeFinalGrades(categories, items, studentIds, scores).map((entry) => [
      entry.studentId,
      entry.percent,
    ]),
  );

  const submittedMap = new Map<string, Set<string>>();
  for (const submission of submissions) {
    const set = submittedMap.get(submission.studentId) ?? new Set<string>();
    set.add(submission.assignmentId);
    submittedMap.set(submission.studentId, set);
  }

  const quizMax = new Map<string, number>();
  const quizAttemptsMap = new Map<string, number>();
  const quizPercentsMap = new Map<string, number[]>();
  for (const quiz of quizzes) {
    const maxScore = quiz.questions.reduce((sum, question) => sum + question.points, 0);
    quizMax.set(quiz.id, maxScore);
    for (const attempt of quiz.attempts) {
      if (!attempt.finishedAt) continue;
      quizAttemptsMap.set(
        attempt.studentId,
        (quizAttemptsMap.get(attempt.studentId) ?? 0) + 1,
      );
      const max = quizMax.get(quiz.id) ?? 0;
      if (attempt.score === null || max <= 0) continue;
      const percent = Math.min(100, Math.max(0, Math.round((attempt.score / max) * 100)));
      const list = quizPercentsMap.get(attempt.studentId) ?? [];
      list.push(percent);
      quizPercentsMap.set(attempt.studentId, list);
    }
  }

  const attendanceMap = new Map<string, { attended: number; total: number }>();
  for (const record of attendance) {
    const entry = attendanceMap.get(record.studentId) ?? { attended: 0, total: 0 };
    entry.total += 1;
    if (record.status === "PRESENT" || record.status === "LATE") entry.attended += 1;
    attendanceMap.set(record.studentId, entry);
  }

  const completedMap = new Map<string, Set<string>>();
  for (const completion of completions) {
    const set = completedMap.get(completion.studentId) ?? new Set<string>();
    set.add(completion.targetId);
    completedMap.set(completion.studentId, set);
  }

  const students: CourseActivityStudent[] = enrollments.map((enrollment) => {
    const studentId = enrollment.user.id;
    const attendanceEntry = attendanceMap.get(studentId);
    const attendanceRate =
      attendanceEntry && attendanceEntry.total > 0
        ? Math.round((attendanceEntry.attended / attendanceEntry.total) * 100)
        : null;
    const completedMaterials = [...(completedMap.get(studentId) ?? [])].filter((id) =>
      materialIds.includes(id),
    ).length;

    return {
      id: studentId,
      name: enrollment.user.name,
      group: enrollment.user.group?.name ?? null,
      submitted: submittedMap.get(studentId)?.size ?? 0,
      assignmentTotal: assignments.length,
      quizAttempts: quizAttemptsMap.get(studentId) ?? 0,
      quizAverage: average(quizPercentsMap.get(studentId) ?? []),
      attendanceRate,
      attendanceRecords: attendanceEntry?.total ?? 0,
      completedMaterials,
      materialTotal: materialIds.length,
      finalPercent: finalMap.get(studentId) ?? null,
    };
  });

  return {
    course,
    students,
    summary: {
      studentCount: students.length,
      attendanceAverage: average(
        students
          .map((student) => student.attendanceRate)
          .filter((value): value is number => value !== null),
      ),
      finalAverage: average(
        students
          .map((student) => student.finalPercent)
          .filter((value): value is number => value !== null),
      ),
    },
  };
}

function finalTone(value: number | null) {
  if (value === null) return "slate" as const;
  if (value >= 80) return "green" as const;
  if (value >= 60) return "amber" as const;
  return "rose" as const;
}

function percentText(value: number | null) {
  return value !== null ? `${value}%` : "—";
}

export function CourseActivityTable({ report }: { report: CourseActivityReport }) {
  if (report.students.length === 0) {
    return <p className="text-sm text-slate-500">Kursda faol talaba yo&apos;q.</p>;
  }

  return (
    <Table className="max-h-[70vh]">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-slate-600">
          <th className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 py-2.5 pr-4 text-left font-medium backdrop-blur">
            Talaba
          </th>
          <th className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-3 py-2.5 text-center font-medium backdrop-blur">
            Topshiriqlar
          </th>
          <th className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-3 py-2.5 text-center font-medium backdrop-blur">
            Testlar
          </th>
          <th className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-3 py-2.5 text-center font-medium backdrop-blur">
            Davomat
          </th>
          <th className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-3 py-2.5 text-center font-medium backdrop-blur">
            Materiallar
          </th>
          <th className="sticky top-0 z-10 rounded-r-xl border-b border-slate-100 bg-brand-50 px-3 py-2.5 text-center font-semibold text-brand-800">
            Yakuniy baho
          </th>
        </tr>
      </thead>
      <tbody>
        {report.students.map((student) => (
          <tr
            key={student.id}
            className="group border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/80"
          >
            <td className="py-3 pr-4">
              <p className="text-sm font-medium text-slate-800 transition-colors duration-150 group-hover:text-brand-900">
                {student.name}
              </p>
              <p className="text-xs text-slate-600">{student.group ?? "Guruhsiz"}</p>
            </td>
            <td className="px-3 py-3 text-center text-sm tabular-nums text-slate-700">
              {student.submitted}/{student.assignmentTotal}
            </td>
            <td className="px-3 py-3 text-center text-sm tabular-nums text-slate-700">
              <span>{student.quizAttempts} ta</span>
              <span className="block text-xs text-slate-600">
                o&apos;rtacha: {percentText(student.quizAverage)}
              </span>
            </td>
            <td className="px-3 py-3 text-center text-sm tabular-nums text-slate-700">
              <span>{percentText(student.attendanceRate)}</span>
              <span className="block text-xs text-slate-600">{student.attendanceRecords} yozuv</span>
            </td>
            <td className="px-3 py-3 text-center text-sm tabular-nums text-slate-700">
              {student.completedMaterials}/{student.materialTotal}
            </td>
            <td className="px-3 py-3 text-center">
              {student.finalPercent !== null ? (
                <Badge tone={finalTone(student.finalPercent)}>{student.finalPercent}%</Badge>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function courseActivityCsv(report: CourseActivityReport) {
  const header = [
    "Talaba",
    "Guruh",
    "Topshiriqlar",
    "Test urinishlari",
    "Testlar o'rtachasi",
    "Davomat",
    "Davomat yozuvlari",
    "Materiallar",
    "Yakuniy baho",
  ];
  const rows = report.students.map((student) => [
    student.name,
    student.group ?? "",
    `${student.submitted}/${student.assignmentTotal}`,
    student.quizAttempts,
    student.quizAverage !== null ? `${student.quizAverage}%` : "",
    student.attendanceRate !== null ? `${student.attendanceRate}%` : "",
    student.attendanceRecords,
    `${student.completedMaterials}/${student.materialTotal}`,
    student.finalPercent !== null ? `${student.finalPercent}%` : "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
