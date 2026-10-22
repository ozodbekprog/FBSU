import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/server/audit";

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 12) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  }
  return value;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER") {
    return Response.json({ ok: false, error: "Faqat OWNER uchun" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(`admin-password:${user.id}`, {
    windowMs: 60 * 60 * 1000,
    maxAttempts: 30,
    keyPrefix: "api",
  });
  if (!rateLimit.allowed) {
    return Response.json({ ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, preferences: true },
  });
  if (!target) return Response.json({ ok: false, error: "Foydalanuvchi topilmadi" }, { status: 404 });
  if (target.role === "OWNER" && target.id !== user.id) {
    return Response.json({ ok: false, error: "OWNER akkauntiga ruxsat yo'q" }, { status: 403 });
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const currentPrefs =
    target.preferences && typeof target.preferences === "object" && !Array.isArray(target.preferences)
      ? (target.preferences as Record<string, unknown>)
      : {};
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash,
      sessionEpoch: { increment: 1 },
      preferences: {
        ...currentPrefs,
        tempPassword: true,
        tempPasswordUsed: false,
        tempPasswordCreatedAt: new Date().toISOString(),
      },
    },
  });
  await logAudit({
    actorId: user.id,
    action: "admin.user.password.reset",
    entity: "User",
    entityId: target.id,
    meta: { temporary: true, role: target.role },
  });

  return Response.json(
    { ok: true, data: { password, email: target.email } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
