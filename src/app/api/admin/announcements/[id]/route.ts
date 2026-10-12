import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { createAuditLog, getClientInfo } from "@/lib/audit";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(_request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, title: true, courseId: true },
  });
  if (!announcement) {
    return Response.json({ ok: false, error: "E'lon topilmadi" }, { status: 404 });
  }
  if (announcement.courseId !== null) {
    return Response.json(
      { ok: false, error: "Bu kurs e'loni — kurs ichidan o'chiring" },
      { status: 400 },
    );
  }

  await prisma.announcement.delete({ where: { id: announcement.id } });

  const clientInfo = getClientInfo(_request);
  await createAuditLog({
    action: "ANNOUNCEMENT_DELETE",
    entity: "Announcement",
    entityId: announcement.id,
    meta: { global: true, title: announcement.title, role: user.role },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { id: announcement.id } });
}
