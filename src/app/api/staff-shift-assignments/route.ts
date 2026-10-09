import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WEEKDAYS_UZ } from "@/lib/payroll";

const assignSchema = z.object({
  userId: z.string().min(1),
  shiftId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
});

/** Barcha xodimlar bo'yicha haftalik navbar jadvali. */
export async function GET() {
  const user = await requireUser();
  if (!(await canManageSalary(user.role))) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const [assignments, shifts, employees] = await Promise.all([
    prisma.staffShiftAssignment.findMany({
      orderBy: [{ weekday: "asc" }],
      select: {
        id: true,
        userId: true,
        weekday: true,
        startsOn: true,
        endsOn: true,
        shift: {
          select: {
            id: true, name: true, startMinutes: true, endMinutes: true, isNight: true,
          },
        },
        user: {
          select: {
            id: true, name: true, role: true,
            staffPosition: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.shift.findMany({
      where: { isActive: true },
      orderBy: { startMinutes: "asc" },
      select: { id: true, name: true, startMinutes: true, endMinutes: true, isNight: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { not: "STUDENT" } },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, role: true,
        staffPosition: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    weekdays: WEEKDAYS_UZ,
    shifts,
    employees,
    assignments: assignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      weekday: a.weekday,
      shift: a.shift,
      employeeName: a.user.name,
      positionName: a.user.staffPosition?.name ?? null,
      departmentName: a.user.department?.name ?? null,
    })),
  });
}

/** Xodimni hafta kuniga navbarga biriktirish. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter navbarni belgilaydi" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON formati noto'g'ri" }, { status: 400 });
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
      { status: 400 },
    );
  }

  const { userId, shiftId, weekday } = parsed.data;
  const startsOn = new Date(Date.UTC(
    new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(),
  ));

  const [employee, shift] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    }),
    prisma.shift.findUnique({ where: { id: shiftId }, select: { id: true, isActive: true } }),
  ]);

  if (!employee) return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
  if (employee.role === "STUDENT") {
    return NextResponse.json({ error: "Talabaga navbar belgilanmaydi" }, { status: 400 });
  }
  if (!shift) return NextResponse.json({ error: "Navbar topilmadi" }, { status: 404 });
  if (!shift.isActive) {
    return NextResponse.json({ error: "Bu navbar o'chirilgan" }, { status: 400 });
  }

  // Bitta kun uchun bitta navbar — takrorlanishini olding.
  const existing = await prisma.staffShiftAssignment.findFirst({
    where: { userId, weekday, endsOn: null },
    select: { id: true },
  });

  const assignment = existing
    ? await prisma.staffShiftAssignment.update({
        where: { id: existing.id },
        data: { shiftId, startsOn },
        select: { id: true, userId: true, weekday: true },
      })
    : await prisma.staffShiftAssignment.create({
        data: { userId, shiftId, weekday, startsOn },
        select: { id: true, userId: true, weekday: true },
      });

  return NextResponse.json({ assignment }, { status: 201 });
}

/** Xodimning hafta kunidagi navbarini o'chirish (bekor qilish). */
export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "Faqat buxgalter navbarni bekor qiladi" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

  const existing = await prisma.staffShiftAssignment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Navbar topilmadi" }, { status: 404 });

  // O'chirmasdan, muddati tugaydi deb belgilaydi — tarix saqlanadi.
  await prisma.staffShiftAssignment.update({
    where: { id },
    data: { endsOn: new Date() },
  });

  return NextResponse.json({ ok: true });
}