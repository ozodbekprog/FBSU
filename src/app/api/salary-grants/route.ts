import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { isGrantableRole, isKnownRole } from "@/lib/payroll";

const bodySchema = z.object({
  role: z.string().min(1),
  canView: z.boolean().default(true),
});

/**
 * BUXGALTER kimlarga oylikni ko'rish ruxsati berishi.
 *
 * Ruxsat **rol** bo'yicha saqlanadi: `SalaryGrant.role` unique. Shu sababli
 * bitta rolga ikki marta ruxsat berib bo'lmaydi — `upsert` ishlatilgan.
 *
 * `revokedAt` — bekor qilinganini belgilaydi, yozuv o'chirilmaydi, chunki
 * bu audit izi.
 */
export async function GET() {
  const user = await requireUser();
  if (!(await canManageSalary(user.role))) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const grants = await prisma.salaryGrant.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      canView: true,
      revokedAt: true,
      createdAt: true,
      grantedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ grants });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter ruxsat beradi" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON formati noto'g'ri" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isKnownRole(parsed.data.role)) {
    return NextResponse.json({ error: "Rol noto'g'ri" }, { status: 400 });
  }

  const role = parsed.data.role;

  // Server tomonda tekshiramiz: faqat lavozim darajasidagi rollarga ruxsat
  // berilishi mumkin. Talaba / ota-ona / oddiy xodimga berilmaydi.
  if (!isGrantableRole(role)) {
    return NextResponse.json(
      { error: "Bu rolga oylik ruxsati berilmaydi" },
      { status: 400 },
    );
  }

  // Buxgalter o'ziga ruxsat berishga muhtoj emas — `canViewSalary` uni
  // har doim yoqishadi. Yozilsa, chalgitish mumkin.
  if (role === "BUXGALTER") {
    return NextResponse.json(
      { error: "Buxgalter oylikni har doim ko'radi" },
      { status: 400 },
    );
  }

  const grant = await prisma.salaryGrant.upsert({
    where: { role },
    create: { role, canView: parsed.data.canView, grantedById: user.id },
    update: {
      canView: parsed.data.canView,
      revokedAt: null,
      grantedById: user.id,
    },
    select: { role: true, canView: true, revokedAt: true, createdAt: true },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "SALARY_GRANT",
    entity: "SalaryGrant",
    entityId: role,
    meta: { role, canView: parsed.data.canView },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return NextResponse.json({ grant }, { status: 201 });
}

/** Bekor qilish — yozuvni o'chirmaydi, `revokedAt` ni to'ldiradi. */
export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter ruxsatni bekor qiladi" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  if (!role || !isKnownRole(role)) {
    return NextResponse.json({ error: "Rol noto'g'ri" }, { status: 400 });
  }

  const existing = await prisma.salaryGrant.findUnique({ where: { role } });
  if (!existing) {
    return NextResponse.json({ error: "Bu rolga ruxsat berilmagamagan" }, { status: 404 });
  }

  const grant = await prisma.salaryGrant.update({
    where: { role },
    data: { revokedAt: new Date() },
    select: { role: true, canView: true, revokedAt: true },
  });

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "SALARY_GRANT_REVOKE",
    entity: "SalaryGrant",
    entityId: role,
    meta: { role },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return NextResponse.json({ grant });
}