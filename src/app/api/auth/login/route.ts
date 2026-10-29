import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import {
  DeviceLimitError,
  MAX_DEVICES,
  countActiveDevices,
  getRequestContext,
  recordBlockedLogin,
} from "@/lib/device";
import { DeviceApprovalDeliveryError, createDeviceApproval } from "@/server/device-approval";
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

  async function startApproval(account: NonNullable<typeof user>) {
    try {
      const approval = await createDeviceApproval(account);
      await createAuditLog({
        action: "DEVICE_APPROVAL_REQUEST",
        entity: "User",
        actorId: account.id,
        entityId: account.id,
        meta: {
          email,
          challengeId: approval.challengeId,
          device: approval.deviceName,
          location: approval.location,
        },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return Response.json(
        {
          ok: false,
          code: "DEVICE_APPROVAL_REQUIRED",
          challengeId: approval.challengeId,
          expiresAt: approval.expiresAt.toISOString(),
          deviceName: approval.deviceName,
          location: approval.location,
          telegramLinked: true,
          error: "Tasdiqlash kodi Telegramingizga yuborildi",
        },
        { status: 403 },
      );
    } catch (error) {
      if (error instanceof DeviceApprovalDeliveryError) {
        const context = await getRequestContext();
        await recordBlockedLogin(account.id, "PASSWORD", context);
        await createAuditLog({
          action: "LOGIN_FAILED",
          entity: "User",
          actorId: account.id,
          entityId: account.id,
          meta: { email, reason: "approval_delivery_failed" },
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        });
        return Response.json(
          {
            ok: false,
            code: "DEVICE_APPROVAL_DELIVERY_FAILED",
            error:
              "Telegramga kod yuborilmadi. @ttpu_uz_bot ni ochib Start bosing yoki mavjud qurilmadan kirib eski qurilmani uzing.",
          },
          { status: 503 },
        );
      }
      throw error;
    }
  }

  if ((await countActiveDevices(user.id)) >= MAX_DEVICES) {
    if (user.telegramId) return startApproval(user);
    const context = await getRequestContext();
    await recordBlockedLogin(user.id, "PASSWORD", context);
    await createAuditLog({
      action: "LOGIN_FAILED",
      entity: "User",
      actorId: user.id,
      entityId: user.id,
      meta: { email, reason: "device_limit_no_telegram" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      {
        ok: false,
        code: "DEVICE_LIMIT",
        error:
          "Bu hisobga faqat 2 ta qurilma ulanadi. Uchinchi qurilma uchun Telegram bog'langan bo'lishi kerak. Mavjud qurilmadan Sozlamalar → Xavfsizlik orqali joy bo'shating yoki administratorga murojaat qiling.",
      },
      { status: 403 },
    );
  }

  let sessionId: string | null = null;
  try {
    const session = await createSession(user, {
      remember: parsed.data.remember,
      method: "PASSWORD",
    });
    sessionId = session.sessionId;
  } catch (error) {
    if (error instanceof DeviceLimitError) {
      if (user.telegramId) return startApproval(user);
      await createAuditLog({
        action: "LOGIN_FAILED",
        entity: "User",
        actorId: user.id,
        entityId: user.id,
        meta: { email, reason: "device_limit" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return Response.json(
        {
          ok: false,
          code: "DEVICE_LIMIT",
          error:
            "Bu hisobga faqat 2 ta qurilma ulanadi. Yangi qurilmadan kirish uchun avval ulangan qurilmalardan birini uzib, qayta urinib ko'ring.",
        },
        { status: 403 },
      );
    }
    throw error;
  }
  await createAuditLog({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    meta: { email, role: user.role, tempPassword },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    sessionId: sessionId ?? undefined,
  });
  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
    tempPasswordUsed: tempPassword,
  });
}