import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomInt, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import {
  DeviceLimitError,
  getRequestContext,
  recordBlockedLogin,
} from "@/lib/device";
import { DeviceApprovalDeliveryError, createDeviceApproval } from "@/server/device-approval";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { getClientIp as getClientIpFromHeaders } from "@/lib/client-ip";
import { createCaptchaChallenge, verifyCaptcha } from "@/lib/captcha";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
  captchaToken: z.string().max(4096).optional(),
  captchaAnswer: z.string().max(16).optional(),
});

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_IP_MAX_ATTEMPTS = 120;
const CAPTCHA_AFTER_ATTEMPTS = 3;

/**
 * Seed skriptlari yaratadigan demo akkauntlar. Ular `ttpu1234` kabi ochiq
 * parol bilan keladi, shuning uchun demo rejim o'chirilganda faqat shu
 * aniq parol bilan kirishga ruxsat berilmaydi — real foydalanuvchi o'z
 * parolini o'zgartirgan bo'lsa, hech qanday cheklov unga tegmaydi.
 */
const DEMO_EMAILS = new Set([
  "admin@ttpu.uz",
  "rektor@ttpu.uz",
  "prorektor@ttpu.uz",
  "dekan@ttpu.uz",
  "kafedra@ttpu.uz",
  "registrar@ttpu.uz",
  "buxgalter@ttpu.uz",
  "tyutor@ttpu.uz",
  "xodim@ttpu.uz",
  "t.prog@ttpu.uz",
  "ozodbek@ttpu.uz",
  "ota-ona@ttpu.uz",
]);
const DEMO_LOGIN_ENABLED = process.env.DEMO_LOGIN_ENABLED === "1";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ttpu1234";
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

  // Bitta IP'dan turli akkauntlarga urinish (credential stuffing) alohida
  // cheklanadi. Universitet NAT'i ortida ko'p talaba bo'lishi mumkin, shuning
  // uchun limit email-IP limitidan ancha yuqori.
  const ipLimit = await checkRateLimit(`login-ip:${getClientIp(request)}`, {
    windowMs: LOGIN_WINDOW_MS,
    maxAttempts: LOGIN_IP_MAX_ATTEMPTS,
    keyPrefix: "auth",
  });
  if (!ipLimit.allowed) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "ip_rate_limited" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((ipLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  // Bir necha marta xato qilgandan keyin captcha talab qilinadi. Bu parol
  // terish botlarini sekinlashtiradi; limit esa urinishlar sonini cheklaydi.
  if (rateLimit.totalAttempts > CAPTCHA_AFTER_ATTEMPTS) {
    const captchaOk = await verifyCaptcha(parsed.data.captchaToken, parsed.data.captchaAnswer);
    if (!captchaOk) {
      const captcha = await createCaptchaChallenge();
      await createAuditLog({
        action: "LOGIN_FAILED",
        meta: { email, reason: "captcha_failed" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return Response.json(
        {
          ok: false,
          code: "CAPTCHA_REQUIRED",
          error: "Xavfsizlik tekshiruvini bajaring",
          data: { captcha },
        },
        { status: 400 },
      );
    }
  }

  // Demo rejim o'chirilganda seed paroli bilan kirish yopiladi.
  if (!DEMO_LOGIN_ENABLED && DEMO_EMAILS.has(email) && parsed.data.password === DEMO_PASSWORD) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "demo_login_disabled" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      { ok: false, error: "Demo kirish o'chirilgan. Administrator bilan bog'laning." },
      { status: 403 },
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

  let sessionId: string | null = null;
  try {
    const session = await createSession(user, {
      remember: parsed.data.remember,
      method: "PASSWORD",
    });
    sessionId = session.sessionId;
  } catch (error) {
    if (error instanceof DeviceLimitError) {
      // Limit faqat Telegram bog'langan hisoblarda qo'llanadi — yangi qurilma
      // tasdiqlash oqimini boshlaymiz. Telegram yo'q bo'lsa, limit umuman
      // ishlamaydi va bu holat yuzaga kelmaydi.
      if (user.telegramId) return startApproval(user);
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