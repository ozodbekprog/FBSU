import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { recordEvent } from "@/modules/events/record";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const cohorts = await prisma.cohort.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return Response.json({
    ok: true,
    data: cohorts.map((cohort) => ({
      id: cohort.id,
      name: cohort.name,
      description: cohort.description,
      createdAt: cohort.createdAt,
      memberCount: cohort._count.members,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Nomni to'g'ri kiriting" }, { status: 400 });
  }

  const name = parsed.data.name;
  const existing = await prisma.cohort.findUnique({ where: { name }, select: { id: true } });
  if (existing) {
    return Response.json({ ok: false, error: "Bu nomdagi kohort mavjud" }, { status: 409 });
  }

  const cohort = await prisma.cohort.create({
    data: {
      name,
      description: parsed.data.description ? parsed.data.description : null,
    },
    include: { _count: { select: { members: true } } },
  });

  await recordEvent(user.id, "cohort.create", {
    entity: "Cohort",
    entityId: cohort.id,
    meta: { name: cohort.name },
  });

  return Response.json(
    {
      ok: true,
      data: {
        id: cohort.id,
        name: cohort.name,
        description: cohort.description,
        createdAt: cohort.createdAt,
        memberCount: cohort._count.members,
      },
    },
    { status: 201 },
  );
}
