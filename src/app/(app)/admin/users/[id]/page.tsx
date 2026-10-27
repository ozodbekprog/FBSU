import Link from "next/link";
import { notFound } from "next/navigation";
import type { AttendanceStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, Badge, Card, CardBody, CardHeader } from "@/components/ui";
import AdminUserEditor from "@/components/admin/AdminUserEditor";
import { getStudentGpa } from "@/app/api/gpa/data";
import { fmtDate, fmtDateTime } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Egasi",
  ADMIN: "Administrator",
  REKTOR: "Rektor",
  PRO_RECTOR: "Prorektor",
  DEKAN: "Dekan",
  KAFEDRA_MUDIRI: "Kafedra mudiri",
  REGISTRAR: "O'quv bo'limi",
  BUXGALTER: "Buxgalter",
  TYUTOR: "Tyutor",
  TEACHER: "O'qituvchi",
  STUDENT: "Talaba",
  XODIM: "Xodim",
  OTA_ONA: "Ota-ona",
  NAZORATCHI: "Nazoratchi",
};

const ROLE_TONE: Record<Role, "brand" | "purple" | "slate" | "blue" | "green" | "gold"> = {
  OWNER: "gold",
  ADMIN: "brand",
  REKTOR: "gold",
  PRO_RECTOR: "gold",
  DEKAN: "purple",
  KAFEDRA_MUDIRI: "blue",
  REGISTRAR: "brand",
  BUXGALTER: "gold",
  TYUTOR: "green",
  TEACHER: "purple",
  STUDENT: "slate",
  XODIM: "slate",
  OTA_ONA: "green",
  NAZORATCHI: "slate",
};

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Qatnashdi",
  LATE: "Kechikdi",
  ABSENT: "Kelmadi",
  EXCUSED: "Sababli",
  SUSPICIOUS: "Shubhali",
  LEFT_EARLY: "Erta ketdi",
};

const WEEKDAYS: Record<number, string> = {
  1: "Dushanba",
  2: "Seshanba",
  3: "Chorshanba",
  4: "Payshanba",
  5: "Juma",
  6: "Shanba",
  7: "Yakshanba",
};

function percentOf(score: number | null, max: number) {
  if (score == null || max <= 0) return null;
  return Math.round((score / max) * 100);
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireRole(["ADMIN", "REGISTRAR", "OWNER"]);
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      faculty: { select: { id: true, name: true } },
      subGroup: { select: { id: true, name: true } },
      staffPosition: { select: { id: true, name: true } },
    },
  });
  if (!user) notFound();
  if (current.role === "REGISTRAR" && user.role !== "STUDENT" && user.role !== "TEACHER") notFound();

  const [groups, departments] = await Promise.all([
    prisma.group.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const isStudent = user.role === "STUDENT";
  const isTeacher = user.role === "TEACHER";
  const canEdit = user.role !== "OWNER" || current.role === "OWNER";
  const canChangeRole = current.role === "ADMIN" || current.role === "OWNER";

  const academic = isStudent
    ? await (async () => {
        const [gpa, attendance, attempts, submissions, enrollments] = await Promise.all([
          getStudentGpa(user.id),
          prisma.attendance.groupBy({
            by: ["status"],
            where: { studentId: user.id },
            _count: { _all: true },
          }),
          prisma.quizAttempt.findMany({
            where: { studentId: user.id, finishedAt: { not: null }, score: { not: null } },
            select: {
              id: true,
              score: true,
              finishedAt: true,
              quiz: {
                select: {
                  title: true,
                  course: { select: { title: true } },
                  questions: { select: { points: true } },
                },
              },
            },
            orderBy: { finishedAt: "desc" },
            take: 10,
          }),
          prisma.submission.findMany({
            where: { studentId: user.id, score: { not: null } },
            select: {
              id: true,
              score: true,
              submittedAt: true,
              assignment: {
                select: { title: true, maxScore: true, course: { select: { title: true } } },
              },
            },
            orderBy: { submittedAt: "desc" },
            take: 10,
          }),
          prisma.enrollment.findMany({
            where: { userId: user.id },
            select: { status: true, course: { select: { title: true, slug: true } } },
            orderBy: { course: { title: "asc" } },
            take: 30,
          }),
        ]);

        const attendanceCounts = new Map(attendance.map((row) => [row.status, row._count._all]));
        const attendanceTotal = attendance.reduce((sum, row) => sum + row._count._all, 0);
        const attended = (attendanceCounts.get("PRESENT") ?? 0) + (attendanceCounts.get("LATE") ?? 0);

        return { gpa, attendanceCounts, attendanceTotal, attended, attempts, submissions, enrollments };
      })()
    : null;

  const teaching = isTeacher
    ? await (async () => {
        const [courses, schedule] = await Promise.all([
          prisma.course.findMany({
            where: { teacherId: user.id },
            select: { id: true, title: true, slug: true, _count: { select: { enrollments: true } } },
            orderBy: { title: "asc" },
            take: 30,
          }),
          prisma.scheduleEntry.findMany({
            where: { teacherId: user.id },
            select: {
              id: true,
              dayOfWeek: true,
              slot: true,
              subject: true,
              room: true,
              group: { select: { name: true } },
            },
            orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
            take: 60,
          }),
        ]);
        return { courses, schedule };
      })()
    : null;

  const attendancePercent =
    academic && academic.attendanceTotal > 0
      ? Math.round((academic.attended / academic.attendanceTotal) * 100)
      : null;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Foydalanuvchilar
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={user.name} src={user.avatarUrl} size={88} className="ring-2 ring-slate-900/10" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-slate-900">{user.name}</h1>
              <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
              <Badge tone={user.isActive ? "green" : "rose"}>{user.isActive ? "Faol" : "Nofaol"}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>Guruh: {user.group?.name ?? "—"}</span>
              <span>Kafedra: {user.department?.name ?? "—"}</span>
              <span>Fakultet: {user.faculty?.name ?? "—"}</span>
              <span>Ro'yxatdan o'tgan: {fmtDate(user.createdAt)}</span>
              <span>Oxirgi kirish: {user.lastSeenAt ? fmtDateTime(user.lastSeenAt) : "—"}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminUserEditor
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            groupId: user.groupId,
            departmentId: user.departmentId,
            isActive: user.isActive,
            avatarUrl: user.avatarUrl,
          }}
          groups={groups}
          departments={departments}
          canEdit={canEdit}
          canChangeRole={canChangeRole}
          canGeneratePassword={current.role === "OWNER"}
          isSelf={user.id === current.id}
        />

        <div className="space-y-5">
          {academic ? (
            <>
              <Card>
                <CardHeader title="GPA va natijalar" subtitle={`${academic.gpa.courses.length} ta kurs bo'yicha`} />
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">GPA</p>
                      <p className="text-2xl font-semibold text-slate-900">{academic.gpa.gpa ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Umumiy foiz</p>
                      <p className="text-2xl font-semibold text-slate-900">{academic.gpa.overallPercent ?? "—"}%</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Davomat</p>
                      <p className="text-2xl font-semibold text-slate-900">{attendancePercent ?? "—"}%</p>
                    </div>
                  </div>

                  {academic.gpa.courses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-2 pe-3">Kurs</th>
                            <th className="py-2 pe-3">Foiz</th>
                            <th className="py-2 pe-3">Baho</th>
                            <th className="py-2">Ball</th>
                          </tr>
                        </thead>
                        <tbody>
                          {academic.gpa.courses.map((course) => (
                            <tr key={course.courseId} className="border-b border-slate-50 last:border-0">
                              <td className="py-2 pe-3 text-slate-700">{course.title}</td>
                              <td className="py-2 pe-3 text-slate-600">{course.percent}%</td>
                              <td className="py-2 pe-3 font-medium text-slate-800">{course.letter}</td>
                              <td className="py-2 text-slate-600">{course.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Hozircha baholangan kurslar yo'q.</p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="So'nggi natijalar" subtitle="Test va topshiriqlar" />
                <CardBody className="space-y-2">
                  {academic.attempts.length === 0 && academic.submissions.length === 0 ? (
                    <p className="text-sm text-slate-500">Natijalar yo'q.</p>
                  ) : (
                    <>
                      {academic.attempts.map((attempt) => {
                        const max = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
                        return (
                          <div key={attempt.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">{attempt.quiz.title}</p>
                              <p className="truncate text-xs text-slate-500">{attempt.quiz.course.title} · test</p>
                            </div>
                            <span className="shrink-0 font-semibold text-slate-900">{percentOf(attempt.score, max) ?? "—"}%</span>
                          </div>
                        );
                      })}
                      {academic.submissions.map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{submission.assignment.title}</p>
                            <p className="truncate text-xs text-slate-500">{submission.assignment.course.title} · topshiriq</p>
                          </div>
                          <span className="shrink-0 font-semibold text-slate-900">
                            {percentOf(submission.score, submission.assignment.maxScore || 100) ?? "—"}%
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Davomat" subtitle={`${academic.attendanceTotal} ta yozuv`} />
                <CardBody className="space-y-2">
                  {academic.attendanceTotal === 0 ? (
                    <p className="text-sm text-slate-500">Davomat yozuvlari yo'q.</p>
                  ) : (
                    [...academic.attendanceCounts.entries()].map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-600">{ATTENDANCE_LABELS[status]}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Kurslar" subtitle={`${academic.enrollments.length} ta yozilish`} />
                <CardBody className="space-y-2">
                  {academic.enrollments.length === 0 ? (
                    <p className="text-sm text-slate-500">Kurslarga yozilmagan.</p>
                  ) : (
                    academic.enrollments.map((enrollment) => (
                      <div key={enrollment.course.slug} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="truncate text-slate-700">{enrollment.course.title}</span>
                        <span className="shrink-0 text-xs text-slate-500">{enrollment.status}</span>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </>
          ) : null}

          {teaching ? (
            <>
              <Card>
                <CardHeader title="Kurslari" subtitle={`${teaching.courses.length} ta kurs`} />
                <CardBody className="space-y-2">
                  {teaching.courses.length === 0 ? (
                    <p className="text-sm text-slate-500">Kurslar yo'q.</p>
                  ) : (
                    teaching.courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="truncate text-slate-700">{course.title}</span>
                        <span className="shrink-0 text-xs text-slate-500">{course._count.enrollments} talaba</span>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Dars jadvali" subtitle={`${teaching.schedule.length} ta dars`} />
                <CardBody className="space-y-2">
                  {teaching.schedule.length === 0 ? (
                    <p className="text-sm text-slate-500">Jadvalda darslar yo'q.</p>
                  ) : (
                    teaching.schedule.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-slate-700">
                          {WEEKDAYS[entry.dayOfWeek] ?? entry.dayOfWeek}, {entry.slot}-par · {entry.subject}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {entry.group?.name ?? "—"}
                          {entry.room ? ` · ${entry.room}` : ""}
                        </span>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </>
          ) : null}

          <Card>
            <CardHeader title="Akkaunt ma'lumotlari" />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="text-slate-500">ID: <span className="text-slate-800">{user.id}</span></p>
              <p className="text-slate-500">Rol: <span className="text-slate-800">{ROLE_LABELS[user.role]}</span></p>
              <p className="text-slate-500">Guruh: <span className="text-slate-800">{user.group?.name ?? "—"}</span></p>
              <p className="text-slate-500">Kichik guruh: <span className="text-slate-800">{user.subGroup?.name ?? "—"}</span></p>
              <p className="text-slate-500">Kafedra: <span className="text-slate-800">{user.department?.name ?? "—"}</span></p>
              <p className="text-slate-500">Lavozim: <span className="text-slate-800">{user.staffPosition?.name ?? "—"}</span></p>
              <p className="text-slate-500">Ro'yxatdan o'tgan: <span className="text-slate-800">{fmtDate(user.createdAt)}</span></p>
              <p className="text-slate-500">Oxirgi faollik: <span className="text-slate-800">{user.lastSeenAt ? fmtDateTime(user.lastSeenAt) : "—"}</span></p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
