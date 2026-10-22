import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { logAudit } from "@/server/audit";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  year: z.number().int().min(2000).max(2100).nullable().optional(),
  curatorId: z.string().trim().min(1).nullable().optional(),
  edupageName: z.string().trim().min(1).max(60).nullable().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  if (parsed.data.name && parsed.data.name !== group.name) {
    const existing = await prisma.group.findUnique({ where: { name: parsed.data.name } });
    if (existing) return Response.json({ ok: false, error: "Bu nomdagi guruh mavjud" }, { status: 409 });
  }

  if (parsed.data.curatorId) {
    const curator = await prisma.user.findUnique({ where: { id: parsed.data.curatorId } });
    if (!curator) return Response.json({ ok: false, error: "Kurator topilmadi" }, { status: 400 });
    if (curator.role !== "TEACHER" && curator.role !== "TYUTOR") {
      return Response.json(
        { ok: false, error: "Kurator faqat o'qituvchi yoki tyutor bo'lishi mumkin" },
        { status: 400 },
      );
    }
    if (!curator.isActive) {
      return Response.json({ ok: false, error: "Kurator faol emas" }, { status: 400 });
    }
  }

  if (parsed.data.edupageName) {
    const clash = await prisma.group.findFirst({
      where: { edupageName: parsed.data.edupageName, id: { not: id } },
      select: { id: true },
    });
    if (clash) {
      return Response.json({ ok: false, error: "Bu EduPage sinfi boshqa guruhga bog'langan" }, { status: 409 });
    }
  }

  const updated = await prisma.group.update({
    where: { id },
    data: {
      name: parsed.data.name,
      year: parsed.data.year === undefined ? undefined : parsed.data.year,
      edupageName:
        parsed.data.edupageName === undefined ? undefined : parsed.data.edupageName,
      curator:
        parsed.data.curatorId === undefined
          ? undefined
          : parsed.data.curatorId
            ? { connect: { id: parsed.data.curatorId } }
            : { disconnect: true },
    },
    include: { _count: { select: { users: true } } },
  });

  await logAudit({
    actorId: user.id,
    action: "admin.group.update",
    entity: "Group",
    entityId: id,
    meta: {
      name: parsed.data.name ?? undefined,
      previousCuratorId: group.curatorId,
      curatorId: parsed.data.curatorId === undefined ? undefined : parsed.data.curatorId,
      edupageName: parsed.data.edupageName ?? undefined,
    },
  });

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!group) return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 404 });
  if (group._count.users > 0) {
    return Response.json(
      { ok: false, error: "Guruhda foydalanuvchilar bor, avval ularni boshqa guruhga o'tkazing" },
      { status: 409 },
    );
  }

  await prisma.group.delete({ where: { id } });
  await logAudit({
    actorId: user.id,
    action: "admin.group.delete",
    entity: "Group",
    entityId: id,
    meta: { name: group.name, year: group.year },
  });
  return Response.json({ ok: true, data: { id } });
}
