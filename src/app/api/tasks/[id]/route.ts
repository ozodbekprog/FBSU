import { z } from "zod";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const MANAGER_ROLES: Role[] = [
  "ADMIN",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
  "TYUTOR",
];

const dueAtSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Sana noto'g'ri");

const managerPatchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  dueAt: dueAtSchema.nullable().optional(),
  status: z.enum(["OPEN", "DONE"]).optional(),
});

const assigneePatchSchema = z.object({
  status: z.enum(["OPEN", "DONE"]),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const task = await prisma.workTask.findUnique({ where: { id } });
  if (!task) return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const isManager = MANAGER_ROLES.includes(user.role);

  const include = {
    assignedTo: { select: { id: true, name: true, email: true, role: true } },
    createdBy: { select: { id: true, name: true } },
  };

  if (isManager) {
    const parsed = managerPatchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
    }

    const updated = await prisma.workTask.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description === undefined ? undefined : parsed.data.description || null,
        dueAt:
          parsed.data.dueAt === undefined
            ? undefined
            : parsed.data.dueAt
              ? new Date(parsed.data.dueAt)
              : null,
        status: parsed.data.status,
        completedAt:
          parsed.data.status === undefined
            ? undefined
            : parsed.data.status === "DONE"
              ? task.completedAt ?? new Date()
              : null,
      },
      include,
    });

    return Response.json({ ok: true, data: updated });
  }

  if (user.id !== task.assignedToId) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }
  if (Object.keys(body).some((key) => key !== "status")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const parsed = assigneePatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const updated = await prisma.workTask.update({
    where: { id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
    include,
  });

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const task = await prisma.workTask.findUnique({ where: { id } });
  if (!task) return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });

  if (task.createdById !== user.id && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.workTask.delete({ where: { id } });

  return Response.json({ ok: true, data: { id } });
}
