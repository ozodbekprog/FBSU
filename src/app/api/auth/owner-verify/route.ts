import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { DeviceLimitError } from "@/lib/device";
import { createVerifiedDeviceApproval } from "@/server/device-approval";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const schema = z.object({
  loginId: z.string().min(1),
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 5;

function hashOwnerCode(code: string, userId: string, loginId: string) {
  return createHash("sha256").update(`${code}:${userId}:${loginId}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kodni to'g'ri kiriting" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { loginId, code } = parsed.data;
  const limitKey = `owner-verify:${loginId}`;
  const rateLimit = await checkRateLimit(limitKey, {
    windowMs: VERIFY_WINDOW_MS,
    maxAttempts: VERIFY_MAX_ATTEMPTS,
    keyPrefix: "auth",
  });

  if (!rateLimit.allowed) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "owner_verify_rate_limited" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  const invalid = () =>
    Response.json({ ok: false, error: "Kod yaroqsiz yoki muddati tugagan" }, { status: 400 });

  const record = await prisma.ownerAccessCode.findUnique({ where: { id: loginId } });
  if (!record || record.consumedAt || record.expiresAt.getTime() <= Date.now()) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "owner_code_missing_expired_or_used" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return invalid();
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.role !== "OWNER") {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { email, reason: "owner_not_found_or_inactive" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return invalid();
  }

  const expected = hashOwnerCode(code, user.id, loginId);
  if (!safeEqual(expected, record.codeHash)) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
      meta: { email, reason: "owner_code_invalid" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return invalid();
  }

  await prisma.ownerAccessCode.update({
    where: { id: loginId },
    data: { consumedAt: new Date() },
  });
  await clearRateLimit(limitKey, "auth");
  try {
    await createSession(user, { method: "OWNER" });
  } catch (error) {
    if (error instanceof DeviceLimitError) {
      const approval = await createVerifiedDeviceApproval(user.id);
      return Response.json(
        {
          ok: false,
          code: "DEVICE_APPROVAL_REQUIRED",
          challengeId: approval.challengeId,
          expiresAt: approval.expiresAt.toISOString(),
          deviceName: approval.deviceName,
          location: approval.location,
          telegramLinked: true,
          verified: true,
          devices: approval.devices,
          error: "2FA tasdiqlandi. Endi eski qurilmalardan birini uzing.",
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
    meta: { email, role: user.role, method: "owner_telegram_2fa" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { verified: true } });
}
