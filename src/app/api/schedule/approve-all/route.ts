import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/server/audit";
import { canApproveSchedule } from "../_helpers";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!canApproveSchedule(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { groupId?: unknown } | null;
  const groupId = typeof body?.groupId === "string" && body.groupId.length > 0 ? body.groupId : null;

  const result = await prisma.scheduleEntry.updateMany({
    where: {
      approval: "PENDING",
      ...(groupId ? { groupId } : {}),
    },
    data: { approval: "APPROVED" },
  });

  if (result.count > 0) {
    await logAudit({
      actorId: user.id,
      action: "schedule.approve_all",
      entity: "ScheduleEntry",
      meta: { count: result.count, groupId },
    });
  }

  return Response.json({ ok: true, data: { count: result.count } });
}
