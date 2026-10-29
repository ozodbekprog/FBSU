import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { currentDeviceId } from "@/lib/device";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Qurilma nomi 2-60 belgi bo'lishi kerak" }, { status: 400 });
  }

  const device = await prisma.trustedDevice.findFirst({
    where: { id, userId: user.id, revokedAt: null },
    select: { id: true },
  });
  if (!device) return Response.json({ ok: false, error: "Qurilma topilmadi" }, { status: 404 });

  await prisma.trustedDevice.update({ where: { id }, data: { name: parsed.data.name } });
  const client = getClientInfo(request);
  await createAuditLog({
    action: "USER_UPDATE",
    entity: "TrustedDevice",
    entityId: id,
    meta: { name: parsed.data.name },
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const device = await prisma.trustedDevice.findFirst({
    where: { id, userId: user.id, revokedAt: null },
    select: { id: true, name: true },
  });
  if (!device) return Response.json({ ok: false, error: "Qurilma topilmadi" }, { status: 404 });

  const currentId = await currentDeviceId(user.id);
  await prisma.trustedDevice.update({
    where: { id },
    data: { revokedAt: new Date(), revokedBy: user.id },
  });
  const client = getClientInfo(request);
  await createAuditLog({
    action: "SESSION_REVOKED",
    entity: "TrustedDevice",
    entityId: id,
    meta: { name: device.name, self: true },
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return Response.json({ ok: true, data: { current: currentId === id } });
}
