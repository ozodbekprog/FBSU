import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { logAudit } from "@/server/audit";
import { hasCapability } from "@/modules/capabilities";

const createSchema = z.object({
  studentId: z.string().trim().min(1),
  amount: z.number().int().positive(),
  method: z.enum(["CASH", "CARD", "BANK"]),
  note: z.string().trim().max(500).nullable().optional(),
  paidAt: z
    .string()
    .trim()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Sana noto'g'ri")
    .nullable()
    .optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT" && !hasCapability(user.role, "finance.view")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  const contractId = url.searchParams.get("contractId");

  const payments = await prisma.payment.findMany({
    where: {
      ...(user.role === "STUDENT" ? { studentId: user.id } : studentId ? { studentId } : {}),
      ...(contractId ? { contractId } : {}),
    },
    orderBy: { paidAt: "desc" },
    take: 200,
    include: {
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return Response.json({ ok: true, data: payments });
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

  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();
  const contract = await prisma.contract.findUnique({
    where: { studentId_year: { studentId: student.id, year: paidAt.getFullYear() } },
    select: { id: true },
  });

  const payment = await prisma.payment.create({
    data: {
      studentId: student.id,
      contractId: contract?.id ?? null,
      amount: parsed.data.amount,
      method: parsed.data.method,
      note: parsed.data.note ? parsed.data.note : null,
      paidAt,
      createdById: user.id,
    },
    include: {
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    actorId: user.id,
    action: "finance.payment.create",
    entity: "Payment",
    entityId: payment.id,
    meta: { studentId: student.id, amount: payment.amount, method: payment.method },
  });

  return Response.json({ ok: true, data: payment }, { status: 201 });
}
