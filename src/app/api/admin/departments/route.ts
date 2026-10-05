import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(20).nullable().optional(),
  facultyId: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const departments = await prisma.department.findMany({
    include: {
      faculty: { select: { id: true, name: true } },
      _count: { select: { users: true, subjects: true } },
    },
    orderBy: { name: "asc" },
  });

  return Response.json({
    ok: true,
    data: departments.map(({ _count, ...department }) => ({
      ...department,
      usersCount: _count.users,
      subjectsCount: _count.subjects,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kafedra ma'lumotlari noto'g'ri" }, { status: 400 });
  }

  const { name, code, facultyId } = parsed.data;
  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing) {
    return Response.json({ ok: false, error: "Bu nomdagi kafedra mavjud" }, { status: 409 });
  }

  if (facultyId) {
    const faculty = await prisma.faculty.findUnique({ where: { id: facultyId }, select: { id: true } });
    if (!faculty) return Response.json({ ok: false, error: "Fakultet topilmadi" }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: { name, code: code ?? null, facultyId: facultyId ?? null },
  });

  return Response.json({ ok: true, data: department }, { status: 201 });
}
