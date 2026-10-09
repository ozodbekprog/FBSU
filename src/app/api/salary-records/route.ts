import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canManageSalary, canViewSalary } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BONUS_MAX,
  SALARY_MAX,
  monthKey,
  monthStart,
  salaryTotalsForMonth,
} from "@/lib/payroll";

/** So'rov jadvali sifati bo'lishi uchun umumiy select. */
const RECORD_SELECT = {
  id: true,
  month: true,
  baseAmount: true,
  bonusAmount: true,
  total: true,
  status: true,
  note: true,
  reviewedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffPosition: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
} as const;

const createSchema = z.object({
  userId: z.string().min(1),
  month: z.string().min(7),
  baseAmount: z.number().int().min(0).max(SALARY_MAX),
  bonusAmount: z.number().int().min(0).max(BONUS_MAX).default(0),
  note: z.string().max(500).optional(),
});

const updateSchema = z.object({
  baseAmount: z.number().int().min(0).max(SALARY_MAX).optional(),
  bonusAmount: z.number().int().min(0).max(BONUS_MAX).optional(),
  note: z.string().max(500).nullable().optional(),
});

/** Jami = bazaviy + ustama. Usaqlar moduli yo'q. */
function totalOf(base: number, bonus: number) {
  return Math.max(0, base + bonus);
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!(await canViewSalary(user.role))) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const from = monthStart(monthParam ?? new Date().toISOString());
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));

  const [records, totals] = await Promise.all([
    prisma.salaryRecord.findMany({
      where: { month: { gte: from, lt: to } },
      select: RECORD_SELECT,
      orderBy: [{ status: "asc" }, { total: "desc" }],
    }),
    salaryTotalsForMonth(from),
  ]);

  // Ko'rish ruxsati bo'lgan, lekin faqat o'z oyligini ko'rishi mumkin bo'lgan
  // rolda — DRAFT yozuvlar butunlay yashiriladi.
  const isManager = canManageSalary(user.role);
  const visible = isManager
    ? records
    : records.map((r) => ({ ...r, note: r.status === "DRAFT" ? null : r.note }))
         .filter((r) => r.status !== "DRAFT");

  return NextResponse.json({
    month: monthKey(from),
    records: visible,
    totals,
    canManage: isManager,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json({ error: "Faqat buxgalter oylik kiritadi" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON formati noto'g'ri" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
      { status: 400 },
    );
  }

  const { userId, month, baseAmount, bonusAmount, note } = parsed.data;
  const monthDate = monthStart(month);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
  }
  if (!target.isActive) {
    return NextResponse.json({ error: "Xodim faol emas" }, { status: 400 });
  }

  const existing = await prisma.salaryRecord.findUnique({
    where: { userId_month: { userId, month: monthDate } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu oy uchun yozuv allaqachon mavjud" },
      { status: 409 },
    );
  }

  const total = totalOf(baseAmount, bonusAmount);
  const record = await prisma.salaryRecord.create({
    data: {
      userId,
      month: monthDate,
      baseAmount,
      bonusAmount,
      total,
      note: note ?? null,
      createdById: user.id,
      // Buxgalter o'zi kiritgani — darhol ko'rib chiqishga yuborilgan holatda.
      status: "PENDING",
    },
    select: RECORD_SELECT,
  });

  return NextResponse.json({ record }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json({ error: "Faqat buxgalter oylikni o'zgartiradi" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON formati noto'g'ri" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
      { status: 400 },
    );
  }

  const current = await prisma.salaryRecord.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });

  // To'lov qilingan yozuvni o'zgartirishga yo'l yo'q — avval bekor qilish kerak.
  if (current.status === "PAID") {
    return NextResponse.json(
      { error: "To'langan oylikni o'zgartirib bo'lmaydi" },
      { status: 400 },
    );
  }

  const baseAmount = parsed.data.baseAmount ?? current.baseAmount;
  const bonusAmount = parsed.data.bonusAmount ?? current.bonusAmount;
  const record = await prisma.salaryRecord.update({
    where: { id },
    data: {
      baseAmount,
      bonusAmount,
      total: totalOf(baseAmount, bonusAmount),
      note: parsed.data.note === undefined ? current.note : parsed.data.note,
    },
    select: RECORD_SELECT,
  });

  return NextResponse.json({ record });
}