import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientInfo } from "@/lib/audit";
import { logAudit } from "@/server/audit";
import { getBackupSnapshot } from "./data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const statsOnly = url.searchParams.get("stats") === "1" || url.pathname.endsWith("/stats");

  const snapshot = await getBackupSnapshot();

  if (statsOnly) {
    return Response.json({ ok: true, data: { exportedAt: snapshot.exportedAt, counts: snapshot.counts } });
  }

  await logAudit({
    actorId: user.id,
    action: "BACKUP_EXPORT",
    entity: "Backup",
    meta: { counts: snapshot.counts },
    ...getClientInfo(request),
  });

  const body = JSON.stringify(snapshot);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fbsu-backup-${snapshot.exportedAt}.json"`,
    },
  });
}
