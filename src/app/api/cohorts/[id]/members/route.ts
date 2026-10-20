import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";

const addSchema = z
  .object({
    userIds: z.array(z.string().trim().min(1)).max(1000).optional(),
    groupId: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => (value.userIds?.length ?? 0) > 0 || Boolean(value.groupId),
    "Foydalanuvchi yoki guruh tanlanmagan",
  );

const removeSchema = z.object({
  userId: z.string().trim().min(1),
});

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const cohort = await prisma.cohort.findUnique({ where: { id }, select: { id: true } });
  if (!cohort) return Response.json({ ok: false, error: "Kohort topilmadi" }, { status: 404 });

  const members = await prisma.cohortMember.findMany({
    where: { cohortId: id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return Response.json({
    ok: true,
    data: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
    })),
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const cohort = await prisma.cohort.findUnique({ where: { id }, select: { id: true } });
  if (!cohort) return Response.json({ ok: false, error: "Kohort topilmadi" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Foydalanuvchi yoki guruh tanlanmagan" }, { status: 400 });
  }

  let targetIds: string[];
  if (parsed.data.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: parsed.data.groupId },
      select: { id: true },
    });
    if (!group) return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 404 });

    const students = await prisma.user.findMany({
      where: { groupId: group.id, role: "STUDENT", isActive: true },
      select: { id: true },
    });
    targetIds = students.map((student) => student.id);
  } else {
    const users = await prisma.user.findMany({
      where: { id: { in: parsed.data.userIds ?? [] }, isActive: true },
      select: { id: true },
    });
    if (users.length === 0) {
      return Response.json({ ok: false, error: "Foydalanuvchi topilmadi" }, { status: 400 });
    }
    targetIds = users.map((entry) => entry.id);
  }

  if (targetIds.length === 0) {
    return Response.json({ ok: true, data: { added: 0 } });
  }

  const result = await prisma.cohortMember.createMany({
    data: targetIds.map((userId) => ({ cohortId: id, userId })),
    skipDuplicates: true,
  });

  return Response.json({ ok: true, data: { added: result.count } });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const cohort = await prisma.cohort.findUnique({ where: { id }, select: { id: true } });
  if (!cohort) return Response.json({ ok: false, error: "Kohort topilmadi" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Foydalanuvchi tanlanmagan" }, { status: 400 });
  }

  const result = await prisma.cohortMember.deleteMany({
    where: { cohortId: id, userId: parsed.data.userId },
  });

  return Response.json({ ok: true, data: { removed: result.count } });
}
