import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  revoked: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getCurrentUser();
  if (!owner || owner.role !== "OWNER") {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (parsed.data.name === undefined && parsed.data.revoked === undefined)) {
    return Response.json({ ok: false, error: "O'zgartirish uchun maydon yuborilmadi" }, { status: 400 });
  }

  const device = await prisma.trustedDevice.findUnique({
    where: { id },
    select: { id: true, name: true, revokedAt: true },
  });
  if (!device) return Response.json({ ok: false, error: "Qurilma topilmadi" }, { status: 404 });

  await prisma.trustedDevice.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.revoked === true ? { revokedAt: new Date(), revokedBy: owner.id } : {}),
      ...(parsed.data.revoked === false ? { revokedAt: null, revokedBy: null } : {}),
    },
  });

  const client = getClientInfo(request);
  await createAuditLog({
    action: parsed.data.revoked === true ? "SESSION_REVOKED" : "USER_UPDATE",
    entity: "TrustedDevice",
    entityId: id,
    meta: { name: parsed.data.name ?? device.name, revoked: parsed.data.revoked ?? null, byOwner: true },
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return Response.json({ ok: true });
}
