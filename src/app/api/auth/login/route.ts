import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomInt, randomUUID } from "node:crypto";
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
const OWNER_CODE_TTL_MS = 5 * 60 * 1000;

function getClientIp(request: Request) {
  return getClientIpFromHeaders(request.headers) ?? "local";
}

function hashOwnerCode(code: string, userId: string, loginId: string) {
  return createHash("sha256").update(`${code}:${userId}:${loginId}`).digest("hex");
}

function generateOwnerCode() {
  return String(randomInt(100000, 1000000));
}

async function sendOwnerCode(token: string, chatId: string, code: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `FBSU OWNER kirish kodi: ${code} (5 daqiqa)`,
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return json?.ok === true;
  } catch {
    return false;
  }
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
    await bcrypt.compare(parsed.data.password.trim(), DUMMY_HASH);
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "user_not_found_or_inactive" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password.trim(), user.passwordHash);
  if (!valid) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, userId: user.id, reason: "invalid_password" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  await clearRateLimit(limitKey, "auth");

  if (user.role === "OWNER") {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.OWNER_TELEGRAM_ID?.trim();

    if (!token || !chatId) {
      await createAuditLog({
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user.id,
        meta: { email, reason: "owner_2fa_not_configured" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return Response.json(
        { ok: false, error: "OWNER kirishi 2FA sozlanmaguncha yopiq" },
        { status: 503 },
      );
    }

    const loginId = randomUUID();
    const code = generateOwnerCode();
    await prisma.ownerAccessCode.create({
      data: {
        id: loginId,
        codeHash: hashOwnerCode(code, user.id, loginId),
        expiresAt: new Date(Date.now() + OWNER_CODE_TTL_MS),
      },
    });

    const sent = await sendOwnerCode(token, chatId, code);
    if (!sent) {
      try {
        await prisma.ownerAccessCode.delete({ where: { id: loginId } });
      } catch {
        void 0;
      }
      await createAuditLog({
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user.id,
        meta: { email, reason: "owner_code_delivery_failed" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return Response.json({ ok: false, error: "Telegramga kod yuborilmadi" }, { status: 502 });
    }

    return Response.json({ ok: true, data: { twoFactor: true, loginId } });
  }

  await createSession(user, { remember: parsed.data.remember });
  await createAuditLog({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    meta: { email, role: user.role },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });
  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });
}