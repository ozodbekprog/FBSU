import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SALARY_MAX } from "@/lib/payroll";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().max(30).optional(),
  baseSalary: z.number().int().min(0).max(SALARY_MAX).default(0),
  departmentId: z.string().nullable().optional(),
});

/** Lavozimlar ro'yxati. O'qish — oylik ruxsati borlarga, yozish — buxgalterga. */
export async function GET() {
  const user = await requireUser();
  if (!(await canManageSalary(user.role))) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const positions = await prisma.staffPosition.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      baseSalary: true,
      isActive: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ positions });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter lavozim yarata oladi" },
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
      { status: 400 },
    );
  }

  const { name, code, baseSalary, departmentId } = parsed.data;

  const existing = await prisma.staffPosition.findFirst({
    where: code ? { OR: [{ name }, { code }] } : { name },
    select: { id: true, name: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `"${existing.name}" lavozim allaqachon bor` },
      { status: 409 },
    );
  }

  if (departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    if (!dept) {
      return NextResponse.json({ error: "Bo'lim topilmadi" }, { status: 404 });
    }
  }

  const position = await prisma.staffPosition.create({
    data: {
      name,
      code: code || null,
      baseSalary,
      departmentId: departmentId || null,
    },
    select: { id: true, name: true, code: true, baseSalary: true, isActive: true },
  });

  return NextResponse.json({ position }, { status: 201 });
}