import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { logAudit } from "@/server/audit";
import { loadFacultyBreakdown, FIN_YEARS } from "@/components/finance/data";

const VIEW_ROLES = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"] as const;

const saveSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  /** facultyId -> summa. Null yoki 0 — o'sha yil uchun summa belgilanmagan. */
  rates: z.record(z.string().trim().min(1), z.number().int().min(0)),
});

function parseYear(raw: string | null): number | null {
  const parsed = raw === null ? null : Number(raw);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 2020 || parsed > 2100) {
    return null;
  }
  return parsed;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!VIEW_ROLES.includes(user.role as (typeof VIEW_ROLES)[number])) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const year = parseYear(new URL(request.url).searchParams.get("year"));
  const target = year ?? FIN_YEARS[FIN_YEARS.length - 1];
  const data = await loadFacultyBreakdown(target);

  return Response.json({
    ok: true,
    data: { year: target, faculties: data.faculties, rates: data.rates, breakdown: data.rows },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const { year, rates } = parsed.data;
  const facultyIds = Object.keys(rates);
  if (facultyIds.length === 0) {
    return Response.json({ ok: false, error: "Hech qanday summa yuborilmadi" }, { status: 400 });
  }

  const known = await prisma.faculty.count({ where: { id: { in: facultyIds } } });
  if (known !== facultyIds.length) {
    return Response.json({ ok: false, error: "Fakultet topilmadi" }, { status: 400 });
  }

  const saved = await prisma.$transaction(
    facultyIds.map((facultyId) => {
      const amount = rates[facultyId];
      return prisma.facultyContractRate.upsert({
        where: { facultyId_year: { facultyId, year } },
        update: { amount },
        create: { facultyId, year, amount },
        select: { facultyId: true, amount: true },
      });
    }),
  );

  await logAudit({
    actorId: user.id,
    action: "finance.facultyRate.set",
    entity: "FacultyContractRate",
    meta: { year, rates: saved },
  });

  const data = await loadFacultyBreakdown(year);

  return Response.json({
    ok: true,
    data: { year, faculties: data.faculties, rates: data.rates, breakdown: data.rows },
  });
}