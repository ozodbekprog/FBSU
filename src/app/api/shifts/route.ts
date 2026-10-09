import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clockToMinutes } from "@/lib/payroll";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  code: z.string().max(30).optional(),
  /** "08:00" / "20:30" */
  start: z.string().min(4).max(5),
  end: z.string().min(4).max(5),
  isNight: z.boolean().default(false),
});

/** Navbar turlari. */
export async function GET() {
  const user = await requireUser();
  if (!(await canManageSalary(user.role))) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const shifts = await prisma.shift.findMany({
    orderBy: [{ isActive: "desc" }, { startMinutes: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      startMinutes: true,
      endMinutes: true,
      isNight: true,
      isActive: true,
      _count: { select: { assignments: true } },
    },
  });

  return NextResponse.json({ shifts });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter navbar qo'sha oladi" },
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

  const { name, code, start, end, isNight } = parsed.data;

  const startMinutes = clockToMinutes(start);
  const endMinutes = clockToMinutes(end);
  if (startMinutes === null) {
    return NextResponse.json({ error: "Boshlanish vaqti «SS:DD» ko'rinishida" }, { status: 400 });
  }
  if (endMinutes === null) {
    return NextResponse.json({ error: "Tugash vaqti «SS:DD» ko'rinishida" }, { status: 400 });
  }
  if (startMinutes === endMinutes) {
    return NextResponse.json(
      { error: "Boshlanish va tugash vaqti bir xil bo'lmasin" },
      { status: 400 },
    );
  }

  const existing = await prisma.shift.findFirst({
    where: code ? { OR: [{ name }, { code }] } : { name },
    select: { id: true, name: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `"${existing.name}" navbar allaqachon bor` },
      { status: 409 },
    );
  }

  const shift = await prisma.shift.create({
    data: {
      name,
      code: code || null,
      startMinutes,
      endMinutes,
      isNight,
    },
    select: {
      id: true, name: true, code: true,
      startMinutes: true, endMinutes: true, isNight: true, isActive: true,
    },
  });

  return NextResponse.json({ shift }, { status: 201 });
}