import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import StaffAttendanceCard, { type StaffOverviewData } from "@/components/staff/staff-attendance-card";

const OVERVIEW_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];

const STAFF_ROLES: Role[] = [
  "XODIM",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
  "TYUTOR",
  "TEACHER",
];

export default async function StaffPage() {
  const user = await requireUser();
  if (user.role === "STUDENT") redirect("/dashboard");

  const dictionary = getDictionary(await getLocale());
  const date = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const [today, history] = await Promise.all([
    prisma.staffAttendance.findUnique({
      where: { userId_date: { userId: user.id, date } },
      select: { id: true, date: true, checkInAt: true, checkOutAt: true },
    }),
    prisma.staffAttendance.findMany({
      where: { userId: user.id },
      select: { id: true, date: true, checkInAt: true, checkOutAt: true },
      orderBy: { date: "desc" },
      take: 14,
    }),
  ]);

  let overview: StaffOverviewData | null = null;
  if (OVERVIEW_ROLES.includes(user.role)) {
    const [records, staffCount] = await Promise.all([
      prisma.staffAttendance.findMany({
        where: { date },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: [{ checkInAt: "asc" }, { id: "asc" }],
      }),
      prisma.user.count({ where: { role: { in: STAFF_ROLES }, isActive: true } }),
    ]);

    overview = {
      stats: {
        present: records.filter((record) => record.checkInAt).length,
        left: records.filter((record) => record.checkOutAt).length,
        notCame: Math.max(0, staffCount - records.length),
      },
      rows: records.map((record) => ({
        id: record.id,
        name: record.user.name,
        role: record.user.role,
        department: record.user.department?.name ?? null,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
      })),
    };
  }

  return (
    <>
      <PageHeader title={dictionary.stfTitle} subtitle={dictionary.stfSubtitle} />
      <StaffAttendanceCard today={today} history={history} overview={overview} />
    </>
  );
}
