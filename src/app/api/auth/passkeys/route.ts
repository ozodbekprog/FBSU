import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { listPasskeys } from "@/server/passkeys";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }
  const items = await listPasskeys(user.id);
  return Response.json({ ok: true, data: { items } });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ ok: false, error: "Passkey ID ko'rsatilmagan" }, { status: 400 });
  }

  const deleted = await prisma.passkeyCredential.deleteMany({ where: { id, userId: user.id } });
  if (deleted.count === 0) {
    return Response.json({ ok: false, error: "Passkey topilmadi" }, { status: 404 });
  }

  const clientInfo = getClientInfo(request);
  await createAuditLog({
    action: "SETTINGS_CHANGE",
    entity: "User",
    entityId: user.id,
    meta: { email: user.email, setting: "passkey_removed" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { removed: deleted.count } });
}
