import { NextResponse } from "next/server";
import { canManageSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/**
 * Oylik yozuvini o'chiradi.
 *
 * Faqat BUXGALTER. `PAID` (to'langan) yozuvni o'chirishga **yo'l yo'q** —
 * to'lov amalga oshgan, uni o'chirish moliyaviy tarihni buzadi.
 * `APPROVED` yozuv ham `DRAFT`/`PENDING` kabi o'chsa bo'ladi, lekin har
 * ikkala holatda ham o'chirilgan qiymatlar audit logga yoziladi.
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter oylikni bekor qiladi" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  const current = await prisma.salaryRecord.findUnique({
    where: { id },
    select: {
      id: true, status: true, baseAmount: true, bonusAmount: true, total: true,
      month: true, userId: true,
      user: { select: { name: true } },
    },
  });
  if (!current) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });

  if (current.status === "PAID") {
    return NextResponse.json(
      { error: "To'langan oylikni bekor qilib bo'lmaydi" },
      { status: 400 },
    );
  }

  await prisma.salaryRecord.delete({ where: { id } });

  const clientInfo = getClientInfo(_request);
  await createAuditLog({
    action: "SALARY_DELETE",
    entity: "SalaryRecord",
    entityId: id,
    meta: {
      employee: current.userId,
      employeeName: current.user.name,
      month: current.month.toISOString().slice(0, 10),
      status: current.status,
      baseAmount: current.baseAmount,
      bonusAmount: current.bonusAmount,
      total: current.total,
    },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return NextResponse.json({ ok: true, id });
}