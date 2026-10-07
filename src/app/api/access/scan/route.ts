import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { verifyAccessToken } from "@/lib/access-token";
import { canScanAccess } from "@/modules/roles/access";

const scanSchema = z.object({
  token: z.string().min(10).max(300),
  direction: z.enum(["IN", "OUT"]),
  gate: z.string().max(60).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!canScanAccess(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const { token, direction } = parsed.data;
  const gate = parsed.data.gate?.trim() || "Asosiy kirish";

  const verified = verifyAccessToken(token);
  if (!verified) {
    await prisma.accessLog.create({
      data: { userId: null, direction, gate, allowed: false, reason: "invalid_token" },
    });
    return Response.json({ ok: true, data: { allowed: false, reason: "invalid" } });
  }

  const person = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, name: true, role: true, avatarUrl: true, isActive: true },
  });

  if (!person) {
    await prisma.accessLog.create({
      data: { userId: null, direction, gate, allowed: false, reason: "not_found" },
    });
    return Response.json({ ok: true, data: { allowed: false, reason: "inactive" } });
  }

  if (!person.isActive) {
    await prisma.accessLog.create({
      data: { userId: person.id, direction, gate, allowed: false, reason: "inactive" },
    });
    return Response.json({ ok: true, data: { allowed: false, reason: "inactive" } });
  }

  const log = await prisma.accessLog.create({
    data: { userId: person.id, direction, gate, allowed: true },
  });

  return Response.json({
    ok: true,
    data: {
      allowed: true,
      user: { id: person.id, name: person.name, role: person.role, avatarUrl: person.avatarUrl },
      direction,
      at: log.at.toISOString(),
      gate,
    },
  });
}
