import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/modules/capabilities";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const dueAtSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Sana noto'g'ri");

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(500).nullable().optional(),
  assignedToId: z.string().trim().min(1),
  dueAt: dueAtSchema.nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const isManager = hasCapability(user.role, "tasks.manage");

  const tasks = await prisma.workTask.findMany({
    where: isManager ? {} : { assignedToId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return Response.json({ ok: true, data: tasks });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "tasks.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const taskRateLimit = await checkRateLimit(`tasks:create:${user.id}`, {
    windowMs: 3_600_000,
    maxAttempts: 30,
    keyPrefix: "api",
  });
  if (!taskRateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p topshiriq. Keyinroq qayta urinib ko'ring" },
      { status: 429 },
    );
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const assignee = await prisma.user.findUnique({
    where: { id: parsed.data.assignedToId },
    select: { id: true, role: true },
  });
  if (!assignee || assignee.role === "STUDENT") {
    return Response.json({ ok: false, error: "Xodim topilmadi" }, { status: 400 });
  }

  const task = await prisma.workTask.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ? parsed.data.description : null,
      assignedToId: assignee.id,
      createdById: user.id,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return Response.json({ ok: true, data: task }, { status: 201 });
}
