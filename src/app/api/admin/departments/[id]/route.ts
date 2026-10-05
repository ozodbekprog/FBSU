import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().max(20).nullable().optional(),
  facultyId: z.string().trim().min(1).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const department = await prisma.department.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!department) return Response.json({ ok: false, error: "Kafedra topilmadi" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  if (parsed.data.name && parsed.data.name !== department.name) {
    const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return Response.json({ ok: false, error: "Bu nomdagi kafedra mavjud" }, { status: 409 });
    }
  }

  if (parsed.data.facultyId) {
    const faculty = await prisma.faculty.findUnique({ where: { id: parsed.data.facultyId }, select: { id: true } });
    if (!faculty) return Response.json({ ok: false, error: "Fakultet topilmadi" }, { status: 400 });
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.code !== undefined ? { code: parsed.data.code ?? null } : {}),
      ...(parsed.data.facultyId !== undefined ? { facultyId: parsed.data.facultyId ?? null } : {}),
    },
  });

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const department = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!department) return Response.json({ ok: false, error: "Kafedra topilmadi" }, { status: 404 });

  await prisma.department.delete({ where: { id } });
  return Response.json({ ok: true, data: { id } });
}
