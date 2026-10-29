import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp as getClientIpFromHeaders } from "@/lib/client-ip";
import {
  DEVICE_APPROVAL_MAX_ATTEMPTS,
  codeMatches,
  listApprovalDevices,
} from "@/server/device-approval";

const schema = z.object({
  challengeId: z.string().min(8).max(100),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kod 6 xonali bo'lishi kerak" }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(
    `device-approval:${getClientIpFromHeaders(request.headers) ?? "local"}`,
    { windowMs: 10 * 60 * 1000, maxAttempts: 30, keyPrefix: "auth" },
  );
  if (!rateLimit.allowed) {
    return Response.json({ ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" }, { status: 429 });
  }

  const challenge = await prisma.deviceApprovalChallenge.findUnique({
    where: { id: parsed.data.challengeId },
    select: {
      id: true,
      userId: true,
      codeHash: true,
      attempts: true,
      verifiedAt: true,
      usedAt: true,
      expiresAt: true,
    },
  });
  if (!challenge) {
    return Response.json({ ok: false, error: "Tasdiqlash sessiyasi topilmadi" }, { status: 404 });
  }
  if (challenge.usedAt) {
    return Response.json({ ok: false, error: "Bu tasdiqlash allaqachon ishlatilgan" }, { status: 409 });
  }
  if (challenge.expiresAt.getTime() <= Date.now()) {
    return Response.json({ ok: false, error: "Kod muddati tugadi. Qaytadan login qiling" }, { status: 410 });
  }
  if (challenge.attempts >= DEVICE_APPROVAL_MAX_ATTEMPTS) {
    return Response.json(
      { ok: false, error: "Kod urinishlari tugadi. Qaytadan login qiling" },
      { status: 429 },
    );
  }

  if (!challenge.verifiedAt) {
    const valid = codeMatches(parsed.data.code, challenge.userId, challenge.id, challenge.codeHash);
    if (!valid) {
      await prisma.deviceApprovalChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      await createAuditLog({
        action: "DEVICE_APPROVAL_FAILED",
        entity: "User",
        actorId: challenge.userId,
        entityId: challenge.userId,
        meta: { challengeId: challenge.id, reason: "wrong_code" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return Response.json({ ok: false, error: "Kod noto'g'ri" }, { status: 401 });
    }
    await prisma.deviceApprovalChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date() },
    });
    await createAuditLog({
      action: "DEVICE_APPROVAL_VERIFIED",
      entity: "User",
      actorId: challenge.userId,
      entityId: challenge.userId,
      meta: { challengeId: challenge.id },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
  }

  const devices = await listApprovalDevices(challenge.userId);
  return Response.json({ ok: true, data: { devices } });
}
