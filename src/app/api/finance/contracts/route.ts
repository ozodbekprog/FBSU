import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { logAudit } from "@/server/audit";
import { hasCapability } from "@/modules/capabilities";

const createSchema = z.object({
  studentId: z.string().trim().min(1),
  year: z.number().int().min(2020).max(2100),
  amount: z.number().int().min(0),
  note: z.string().trim().max(500).nullable().optional(),
});

async function paidSumsByContract(contractIds: string[]) {
  const sums = new Map<string, number>();
  if (contractIds.length === 0) return sums;
  const grouped = await prisma.payment.groupBy({
    by: ["contractId"],
    where: { contractId: { in: contractIds } },
    _sum: { amount: true },
  });
  for (const row of grouped) {
    if (row.contractId) sums.set(row.contractId, row._sum.amount ?? 0);
  }
  return sums;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT" && !hasCapability(user.role, "finance.view")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rawYear = new URL(request.url).searchParams.get("year");
  const parsedYear = rawYear === null ? null : Number(rawYear);
  const year =
    parsedYear !== null && Number.isInteger(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100
      ? parsedYear
      : null;

  const contracts = await prisma.contract.findMany({
    where: {
      ...(user.role === "STUDENT" ? { studentId: user.id } : {}),
      ...(year !== null ? { year } : {}),
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
    },
  });

  const paidSums = await paidSumsByContract(contracts.map((contract) => contract.id));

  const data = contracts.map((contract) => {
    const paid = paidSums.get(contract.id) ?? 0;
    return {
      id: contract.id,
      studentId: contract.studentId,
      studentName: contract.student.name,
      groupName: contract.student.group?.name ?? null,
      year: contract.year,
      amount: contract.amount,
      note: contract.note,
      createdAt: contract.createdAt,
      paid,
      debt: contract.amount - paid,
    };
  });

  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 400 });
  }

  const existing = await prisma.contract.findUnique({
    where: { studentId_year: { studentId: student.id, year: parsed.data.year } },
    select: { id: true },
  });
  if (existing) {
    return Response.json(
      { ok: false, error: "Bu talabaning shu yildagi shartnomasi mavjud" },
      { status: 409 },
    );
  }

  const contract = await prisma.contract.create({
    data: {
      studentId: student.id,
      year: parsed.data.year,
      amount: parsed.data.amount,
      note: parsed.data.note ? parsed.data.note : null,
    },
    include: {
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
    },
  });

  await logAudit({
    actorId: user.id,
    action: "finance.contract.create",
    entity: "Contract",
    entityId: contract.id,
    meta: { studentId: student.id, year: contract.year, amount: contract.amount },
  });

  return Response.json(
    {
      ok: true,
      data: {
        ...contract,
        studentName: contract.student.name,
        groupName: contract.student.group?.name ?? null,
        paid: 0,
        debt: contract.amount,
      },
    },
    { status: 201 },
  );
}
