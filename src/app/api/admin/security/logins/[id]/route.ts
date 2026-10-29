import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const schema = z.object({
  deviceName: z.string().trim().min(2).max(80).optional(),
  note: z.string().trim().max(500).optional(),
});

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return null;
  return user;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner) return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (parsed.data.deviceName === undefined && parsed.data.note === undefined)) {
    return Response.json({ ok: false, error: "O'zgartirish uchun maydon yuborilmadi" }, { status: 400 });
  }

  const record = await prisma.loginRecord.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!record) return Response.json({ ok: false, error: "Yozuv topilmadi" }, { status: 404 });

  await prisma.loginRecord.update({
    where: { id },
    data: {
      ...(parsed.data.deviceName !== undefined ? { deviceName: parsed.data.deviceName } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note || null } : {}),
      editedAt: new Date(),
      editedBy: owner.id,
    },
  });

  const client = getClientInfo(request);
  await createAuditLog({
    action: "USER_UPDATE",
    entity: "LoginRecord",
    entityId: id,
    meta: { deviceName: parsed.data.deviceName ?? null, noteChanged: parsed.data.note !== undefined },
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner) return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });

  const { id } = await params;
  const record = await prisma.loginRecord.findUnique({ where: { id }, select: { id: true } });
  if (!record) return Response.json({ ok: false, error: "Yozuv topilmadi" }, { status: 404 });

  await prisma.loginRecord.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: owner.id },
  });
  const client = getClientInfo(request);
  await createAuditLog({
    action: "USER_DELETE",
    entity: "LoginRecord",
    entityId: id,
    meta: { soft: true },
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return Response.json({ ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner) return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });

  const { id } = await params;
  const record = await prisma.loginRecord.findUnique({ where: { id }, select: { id: true } });
  if (!record) return Response.json({ ok: false, error: "Yozuv topilmadi" }, { status: 404 });

  await prisma.loginRecord.update({
    where: { id },
    data: { deletedAt: null, deletedBy: null },
  });
  const client = getClientInfo(request);
  await createAuditLog({
    action: "USER_UPDATE",
    entity: "LoginRecord",
    entityId: id,
    meta: { restored: true },
    ip: client.ip,
    userAgent: client.userAgent,
  });
  return Response.json({ ok: true });
}
