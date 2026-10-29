import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { DeviceLimitError } from "@/lib/device";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const schema = z.object({
  challengeId: z.string().min(8).max(100),
  deviceId: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Qurilma tanlanmadi" }, { status: 400 });
  }

  const challenge = await prisma.deviceApprovalChallenge.findUnique({
    where: { id: parsed.data.challengeId },
    include: { user: true },
  });
  if (!challenge) {
    return Response.json({ ok: false, error: "Tasdiqlash sessiyasi topilmadi" }, { status: 404 });
  }
  if (challenge.usedAt) {
    return Response.json({ ok: false, error: "Bu tasdiqlash allaqachon ishlatilgan" }, { status: 409 });
  }
  if (!challenge.verifiedAt) {
    return Response.json({ ok: false, error: "Avval Telegram kodini tasdiqlang" }, { status: 409 });
  }
  if (challenge.expiresAt.getTime() <= Date.now()) {
    return Response.json({ ok: false, error: "Tasdiqlash muddati tugadi. Qaytadan login qiling" }, { status: 410 });
  }

  const device = await prisma.trustedDevice.findFirst({
    where: { id: parsed.data.deviceId, userId: challenge.userId, revokedAt: null },
    select: { id: true, name: true },
  });
  if (!device) {
    return Response.json({ ok: false, error: "Qurilma topilmadi yoki allaqachon uzilgan" }, { status: 404 });
  }

  const claimed = await prisma.deviceApprovalChallenge.updateMany({
    where: {
      id: challenge.id,
      usedAt: null,
      verifiedAt: { not: null },
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) {
    return Response.json({ ok: false, error: "Tasdiqlash muddati tugagan" }, { status: 409 });
  }

  await prisma.trustedDevice.update({
    where: { id: device.id },
    data: { revokedAt: new Date(), revokedBy: challenge.userId },
  });

  let sessionId: string | null = null;
  try {
    const session = await createSession(challenge.user, {
      method: challenge.method,
      note: `Telegram kodi bilan tasdiqlangan yangi qurilma; "${device.name}" uzildi.`,
    });
    sessionId = session.sessionId;
  } catch (error) {
    if (error instanceof DeviceLimitError) {
      return Response.json(
        {
          ok: false,
          error: "Qurilma limiti qayta to'ldi. Qaytadan login qilib ko'ring.",
        },
        { status: 409 },
      );
    }
    throw error;
  }

  await createAuditLog({
    action: "SESSION_REVOKED",
    entity: "TrustedDevice",
    entityId: device.id,
    meta: { name: device.name, reason: "device_approval" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    sessionId: sessionId ?? undefined,
  });
  await createAuditLog({
    action: "DEVICE_APPROVAL_SUCCESS",
    entity: "User",
    entityId: challenge.userId,
    meta: { challengeId: challenge.id, revokedDevice: device.name },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    sessionId: sessionId ?? undefined,
  });
  await createAuditLog({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: challenge.userId,
    meta: { email: challenge.user.email, via: "device_approval" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    sessionId: sessionId ?? undefined,
  });

  return Response.json({
    ok: true,
    user: { id: challenge.user.id, name: challenge.user.name, role: challenge.user.role },
    revokedDevice: { id: device.id, name: device.name },
  });
}
