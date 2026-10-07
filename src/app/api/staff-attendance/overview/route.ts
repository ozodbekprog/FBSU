import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function todayDate() {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!OVERVIEW_ROLES.includes(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const date = todayDate();
  const [records, staffCount] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: { date },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ checkInAt: "asc" }, { id: "asc" }],
    }),
    prisma.user.count({ where: { role: { in: STAFF_ROLES }, isActive: true } }),
  ]);

  const activeRecords = records.filter(
    (record) => record.user.isActive && STAFF_ROLES.includes(record.user.role),
  );

  const rows = records.map((record) => ({
    id: record.id,
    name: record.user.name,
    role: record.user.role,
    department: record.user.department?.name ?? null,
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
  }));

  return Response.json({
    ok: true,
    data: {
      date,
      rows,
      stats: {
        present: activeRecords.filter((record) => record.checkInAt).length,
        left: activeRecords.filter((record) => record.checkOutAt).length,
        notCame: Math.max(0, staffCount - activeRecords.length),
      },
    },
  });
}
