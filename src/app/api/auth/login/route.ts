import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { getClientIp as getClientIpFromHeaders } from "@/lib/client-ip";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const DUMMY_HASH = "$2b$10$vabGzMWs78G4gDK4w4uNiO.wWPeTboNzwBwuVLU5Ht1xJQBWXtiZS";

function getClientIp(request: Request) {
  return getClientIpFromHeaders(request.headers) ?? "local";
}

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Email va parolni to'g'ri kiriting" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const limitKey = `login:${getClientIp(request)}:${email}`;
  const rateLimit = await checkRateLimit(limitKey, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_MAX_ATTEMPTS,
    keyPrefix: "auth",
  });

  if (!rateLimit.allowed) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "rate_limited" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await bcrypt.compare(parsed.data.password, DUMMY_HASH);
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "user_not_found_or_inactive" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, userId: user.id, reason: "invalid_password" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  const preferences =
    user.preferences && typeof user.preferences === "object" && !Array.isArray(user.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};
  const tempPassword = preferences.tempPassword === true;
  if (tempPassword && preferences.tempPasswordUsed === true) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, userId: user.id, reason: "temp_password_used" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      {
        ok: false,
        error: "Vaqtinchalik parol allaqachon ishlatilgan. Yangi parol uchun administratorga murojaat qiling.",
      },
      { status: 401 },
    );
  }

  if (tempPassword) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: {
          ...preferences,
          tempPasswordUsed: true,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await clearRateLimit(limitKey, "auth");
  await createSession(user, { remember: parsed.data.remember });
  await createAuditLog({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    meta: { email, role: user.role, tempPassword },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });
  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
    tempPasswordUsed: tempPassword,
  });
}