import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXPORT_TYPES = ["students", "teachers", "grades", "attendance"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvBody(rows: CsvValue[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function averageText(values: number[]): string {
  if (values.length === 0) return "";
  const sum = values.reduce((total, value) => total + value, 0);
  return (sum / values.length).toFixed(1);
}

async function buildRows(type: ExportType): Promise<CsvValue[][]> {
  if (type === "students") {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      orderBy: { name: "asc" },
      select: {
        name: true,
        email: true,
        group: { select: { name: true } },
        faculty: { select: { name: true } },
      },
    });

    return [
      ["F.I.O", "Email", "Guruh", "Fakultet", "Holat"],
      ...students.map((student) => [
        student.name,
        student.email,
        student.group?.name ?? "",
        student.faculty?.name ?? "",
        "Faol",
      ]),
    ];
  }

  if (type === "teachers") {
    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      orderBy: { name: "asc" },
      select: {
        name: true,
        email: true,
        department: { select: { name: true } },
        faculty: { select: { name: true } },
      },
    });

    return [
      ["F.I.O", "Email", "Kafedra", "Fakultet"],
      ...teachers.map((teacher) => [
        teacher.name,
        teacher.email,
        teacher.department?.name ?? "",
        teacher.faculty?.name ?? "",
      ]),
    ];
  }

  if (type === "grades") {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE", user: { role: "STUDENT", isActive: true } },
      orderBy: [{ user: { name: "asc" } }, { course: { title: "asc" } }],
      select: {
        userId: true,
        courseId: true,
        user: { select: { name: true, group: { select: { name: true } } } },
        course: { select: { title: true } },
      },
    });

    const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];

    const [submissions, attempts] = await Promise.all([
      prisma.submission.findMany({
        where: { studentId: { in: studentIds }, score: { not: null } },
        select: { studentId: true, score: true, assignment: { select: { courseId: true } } },
      }),
      prisma.quizAttempt.findMany({
        where: { studentId: { in: studentIds }, score: { not: null } },
        select: { studentId: true, score: true, quiz: { select: { courseId: true } } },
      }),
    ]);

    const submissionScores = new Map<string, number[]>();
    const attemptScores = new Map<string, number[]>();

    for (const submission of submissions) {
      if (submission.score === null) continue;
      const key = `${submission.studentId}:${submission.assignment.courseId}`;
      const scores = submissionScores.get(key) ?? [];
      scores.push(submission.score);
      submissionScores.set(key, scores);
    }

    for (const attempt of attempts) {
      if (attempt.score === null) continue;
      const key = `${attempt.studentId}:${attempt.quiz.courseId}`;
      const scores = attemptScores.get(key) ?? [];
      scores.push(attempt.score);
      attemptScores.set(key, scores);
    }

    return [
      ["Talaba", "Guruh", "Kurs", "Test o'rtachasi", "Topshiriq o'rtachasi"],
      ...enrollments.map((enrollment) => {
        const key = `${enrollment.userId}:${enrollment.courseId}`;
        return [
          enrollment.user.name,
          enrollment.user.group?.name ?? "",
          enrollment.course.title,
          averageText(attemptScores.get(key) ?? []),
          averageText(submissionScores.get(key) ?? []),
        ];
      }),
    ];
  }

  const records = await prisma.attendance.findMany({
    where: { student: { role: "STUDENT", isActive: true } },
    orderBy: [{ student: { name: "asc" } }, { course: { title: "asc" } }],
    select: {
      studentId: true,
      courseId: true,
      status: true,
      student: { select: { name: true, group: { select: { name: true } } } },
      course: { select: { title: true } },
    },
  });

  const stats = new Map<
    string,
    { name: string; group: string; course: string; total: number; present: number }
  >();

  for (const record of records) {
    const key = `${record.studentId}:${record.courseId}`;
    const current =
      stats.get(key) ??
      {
        name: record.student.name,
        group: record.student.group?.name ?? "",
        course: record.course.title,
        total: 0,
        present: 0,
      };
    current.total += 1;
    if (record.status === "PRESENT" || record.status === "LATE") current.present += 1;
    stats.set(key, current);
  }

  return [
    ["Talaba", "Guruh", "Kurs", "Jami", "Kelgan", "Foiz"],
    ...[...stats.values()].map((row) => [
      row.name,
      row.group,
      row.course,
      row.total,
      row.present,
      Math.round((row.present / row.total) * 100),
    ]),
  ];
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = z.enum(EXPORT_TYPES).safeParse(new URL(request.url).searchParams.get("type"));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Eksport turi noto'g'ri" }, { status: 400 });
  }

  const rows = await buildRows(parsed.data);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csvBody(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hemis-${parsed.data}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
