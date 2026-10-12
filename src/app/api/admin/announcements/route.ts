import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().trim().min(1, "Sarlavha kiriting").max(200),
  body: z.string().trim().min(1, "E'lon matnini kiriting").max(10000),
  audience: z
    .union([
      z.literal("ALL"),
      z.object({ roles: z.array(z.string()).min(1, "Kamida bitta rol tanlang") }),
    ])
    .default("ALL"),
});

function notificationTargetsFor(audience: {
  roles: string[];
}): Promise<Array<{ id: string }>> {
  const roles = audience.roles as Role[];
  return prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });
}

async function notifyTargets(
  targets: Array<{ id: string }>,
  announcement: { title: string; body: string; id: string },
): Promise<void> {
  if (targets.length === 0) return;
  await prisma.notification.createMany({
    data: targets.map((target) => ({
      userId: target.id,
      title: `Yangi e'lon: ${announcement.title}`,
      body: announcement.body.slice(0, 200),
      link: "/notifications",
    })),
  });
}

function audienceLabel(audience: "ALL" | { roles: string[] }): string {
  if (audience === "ALL") return "ALL";
  return audience.roles.join(",");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const announcements = await prisma.announcement.findMany({
    where: { courseId: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  return Response.json({
    ok: true,
    data: { announcements },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const audience = parsed.data.audience;
  const targets =
    audience === "ALL"
      ? await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true },
        })
      : await notificationTargetsFor(audience);

  const announcement = await prisma.announcement.create({
    data: {
      courseId: null,
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      audience: audience === "ALL" ? "ALL" : { roles: audience.roles },
    },
    include: { author: { select: { id: true, name: true } } },
  });

  await notifyTargets(targets, announcement);

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "ANNOUNCEMENT_CREATE",
    entity: "Announcement",
    entityId: announcement.id,
    meta: {
      global: true,
      audience: audienceLabel(audience),
      recipients: targets.length,
      role: user.role,
    },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json(
    {
      ok: true,
      data: { announcement, recipients: targets.length },
    },
    { status: 201 },
  );
}
