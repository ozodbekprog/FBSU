import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  Stat,
  Table,
} from "@/components/ui";
import { atRiskStudents, attendancePercent } from "@/modules/monitoring/attendance-kpi";
import { canViewMonitoring } from "@/modules/roles/access";

function toneFor(percent: number): "green" | "amber" | "rose" {
  if (percent >= 80) return "green";
  if (percent >= 60) return "amber";
  return "rose";
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ facultyId?: string; groupId?: string }>;
}) {
  const user = await requireUser();
  if (!canViewMonitoring(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const rawFacultyId =
    typeof params.facultyId === "string" && params.facultyId.length > 0 ? params.facultyId : null;
  const groupId =
    typeof params.groupId === "string" && params.groupId.length > 0 ? params.groupId : null;

  const isDean = user.role === "DEKAN";
  const isDeptHead = user.role === "KAFEDRA_MUDIRI";
  const facultyId = isDean ? user.facultyId : rawFacultyId;

  let deptGroupIds: string[] | null = null;
  if (isDeptHead) {
    if (!user.departmentId) {
      deptGroupIds = [];
    } else {
      const deptRows = await prisma.enrollment.findMany({
        where: {
          status: "ACTIVE",
          course: { teacher: { departmentId: user.departmentId } },
        },
        select: { user: { select: { groupId: true } } },
      });
      deptGroupIds = Array.from(
        new Set(
          deptRows
            .map((row) => row.user.groupId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
    }
  }
  const scopeBlocked = (isDean && !user.facultyId) || (isDeptHead && !user.departmentId);

  const [faculties, allGroups] = await Promise.all([
    prisma.faculty.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.group.findMany({
      select: { id: true, name: true, facultyId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const scopeGroups = allGroups.filter((group) => {
    if (scopeBlocked) return false;
    if (isDeptHead) {
      if (!deptGroupIds?.includes(group.id)) return false;
    } else if (facultyId && group.facultyId !== facultyId) {
      return false;
    }
    if (groupId && group.id !== groupId) return false;
    return true;
  });
  const scopeGroupIds = scopeGroups.map((group) => group.id);
  const groupOptions = allGroups.filter((group) => {
    if (isDeptHead) return deptGroupIds?.includes(group.id) ?? false;
    if (facultyId) return group.facultyId === facultyId;
    return true;
  });

  const [students, teachersCount, coursesCount, attendanceRows, submissionsTotal, submissionsGraded, pendingSchedule] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT", isActive: true, groupId: { in: scopeGroupIds } },
        select: { id: true, groupId: true },
      }),
      prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
      prisma.course.count(),
      prisma.attendance.findMany({
        where: { student: { groupId: { in: scopeGroupIds } } },
        select: { studentId: true, status: true, student: { select: { groupId: true } } },
      }),
      prisma.submission.count({ where: { student: { groupId: { in: scopeGroupIds } } } }),
      prisma.submission.count({
        where: { student: { groupId: { in: scopeGroupIds } }, status: "GRADED" },
      }),
      prisma.scheduleEntry.count({
        where: { groupId: { in: scopeGroupIds }, approval: "PENDING" },
      }),
    ]);

  const overallPercent = attendancePercent(attendanceRows.map((row) => row.status));
  const risk = atRiskStudents(
    attendanceRows.map((row) => ({ studentId: row.studentId, status: row.status })),
  );
  const riskTop = risk.slice(0, 10);
  const riskUsers = riskTop.length
    ? await prisma.user.findMany({
        where: { id: { in: riskTop.map((row) => row.studentId) } },
        select: { id: true, name: true, group: { select: { name: true } } },
      })
    : [];
  const riskUserMap = new Map(riskUsers.map((row) => [row.id, row]));

  const groupStats = scopeGroups
    .map((group) => {
      const groupRows = attendanceRows.filter((row) => row.student.groupId === group.id);
      return {
        id: group.id,
        name: group.name,
        studentCount: students.filter((student) => student.groupId === group.id).length,
        records: groupRows.length,
        percent: attendancePercent(groupRows.map((row) => row.status)),
      };
    })
    .sort((a, b) => a.percent - b.percent);

  const gradedPercent =
    submissionsTotal > 0 ? Math.round((submissionsGraded / submissionsTotal) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Boshqaruv"
        title="Monitoring"
        subtitle="Rahbariyat uchun ko'rsatkichlar — fakultet va guruh kesimida"
      />

      <form method="get" className="mb-5">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            {!isDean && !isDeptHead ? (
              <div className="w-full sm:w-64">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Fakultet</label>
                <Select name="facultyId" defaultValue={facultyId ?? ""}>
                  <option value="">Barcha fakultetlar</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="w-full sm:w-56">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Guruh</label>
              <Select name="groupId" defaultValue={groupId ?? ""}>
                <option value="">Barcha guruhlar</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Ko&apos;rish
            </Button>
            {isDean ? (
              <p className="text-xs font-medium text-slate-500">
                Doira: {user.faculty?.name ?? "Fakultet biriktirilmagan"}
              </p>
            ) : null}
            {isDeptHead ? (
              <p className="text-xs font-medium text-slate-500">
                Doira: {user.department?.name ?? "Kafedra biriktirilmagan"}
              </p>
            ) : null}
            {scopeBlocked ? (
              <p className="text-xs font-medium text-rose-600">
                {isDean ? "Sizga fakultet biriktirilmagan" : "Sizga kafedra biriktirilmagan"}
              </p>
            ) : null}
            {facultyId || groupId ? (
              <a
                href="/monitoring"
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                Tozalash
              </a>
            ) : null}
          </CardBody>
        </Card>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Talabalar" value={students.length} hint={scopeGroups.length > 0 ? `${scopeGroups.length} ta guruh` : "Guruh tanlanmagan"} />
        <Stat label="O'qituvchilar" value={teachersCount} hint="Faol o'qituvchilar" />
        <Stat label="Kurslar" value={coursesCount} hint="Jami kurslar" />
        <Stat
          label="Umumiy davomat"
          value={`${overallPercent}%`}
          hint="PRESENT + LATE asosida"
        />
        <Stat
          label="Baholangan topshiriqlar"
          value={`${gradedPercent}%`}
          hint={`${submissionsGraded}/${submissionsTotal} ta javob baholangan`}
        />
        <Stat
          label="Tasdiq kutayotgan jadval"
          value={pendingSchedule}
          hint={pendingSchedule > 0 ? "Tasdiqlashlar bo'limini ko'ring" : "Navbat toza"}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Guruhlar kesimida davomat"
            subtitle="Eng past ko'rsatkichdan boshlab"
          />
          <CardBody>
            {groupStats.length === 0 ? (
              <EmptyState title="Ma'lumot yo'q" description="Tanlangan filtr bo'yicha guruh topilmadi." />
            ) : (
              <Table>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="rounded-l-xl py-2.5 pr-3 pl-3 text-left font-medium">Guruh</th>
                    <th className="px-3 py-2.5 text-left font-medium">Talabalar</th>
                    <th className="px-3 py-2.5 text-left font-medium">Yozuvlar</th>
                    <th className="rounded-r-xl px-3 py-2.5 text-left font-medium">Davomat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupStats.map((group) => (
                    <tr key={group.id}>
                      <td className="py-2.5 pr-3 pl-3 text-sm font-medium text-slate-800">{group.name}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{group.studentCount}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-600">{group.records}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={toneFor(group.percent)}>{group.percent}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Xavf ostidagi talabalar"
            subtitle="Davomat 80% dan past (imtihonga ruxsat xavfi)"
          />
          <CardBody>
            {riskTop.length === 0 ? (
              <EmptyState
                title="Xavf yo'q"
                description="Tanlangan doira bo'yicha 80% dan past davomatli talaba topilmadi."
              />
            ) : (
              <div className="space-y-2">
                {riskTop.map((row) => {
                  const person = riskUserMap.get(row.studentId);
                  return (
                    <div
                      key={row.studentId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {person?.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {person?.group?.name ?? "—"} · {row.attended}/{row.total} dars
                        </p>
                      </div>
                      <Badge tone={toneFor(row.percent)}>{row.percent}%</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
