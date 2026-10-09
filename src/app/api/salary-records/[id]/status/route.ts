import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const bodySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "PAID"]),
  note: z.string().max(500).nullable().optional(),
});

/**
 * Oylik yozuvining maqomini o'zgartiradi: PENDING → APPROVED → PAID.
 *
 * Faqat BUXGALTER. Har bir o'zgarish audit logga yoziladi, chunki bu
 * moliyaviy ma'lumot — kim, qachon, nimani tasdiqlaganini bilish kerak.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter oylikni nazorat qiladi" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON formati noto'g'ri" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Maqom noto'g'ri" }, { status: 400 });
  }

  const current = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });

  const next = parsed.data.status;

  // Bosqichlar faqat oldinga: PENDING → APPROVED → PAID.
  // Orqariga qaytishga yo'l yo'q — ma'lumot tarixi buzilmasin.
  const order = { PENDING: 1, APPROVED: 2, PAID: 3 } as const;
  if (order[next] < order[current.status as keyof typeof order]) {
    return NextResponse.json(
      { error: `Maqomni orqaga qaytarib bo'lmaydi (hozirgi: ${current.status})` },
      { status: 400 },
    );
  }
  if (current.status === "PAID" && next === "PAID") {
    return NextResponse.json({ error: "Allaqachon to'langan" }, { status: 409 });
  }

  const record = await prisma.salaryRecord.update({
    where: { id },
    data: {
      status: next,
      reviewedById: user.id,
      reviewedAt: new Date(),
      note: parsed.data.note === undefined ? current.note : parsed.data.note,
    },
    select: {
      id: true, status: true, total: true, month: true, reviewedAt: true,
      user: { select: { name: true } },
    },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "SALARY_STATUS_CHANGE",
    entity: "SalaryRecord",
    entityId: id,
    meta: {
      from: current.status,
      to: next,
      total: current.total,
      employee: current.userId,
    },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return NextResponse.json({ record });
}