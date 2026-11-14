import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordEvent } from "@/modules/events/record";
import {
  capNoticeLines,
  scheduleLine,
  sendScheduleNotices,
} from "@/server/telegram/schedule-notify";
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

  const pending = await prisma.scheduleEntry.findMany({
    where: {
      approval: "PENDING",
      ...(groupId ? { groupId } : {}),
    },
    select: {
      groupId: true,
      teacherId: true,
      teacher: true,
      dayOfWeek: true,
      slot: true,
      subject: true,
      room: true,
      status: true,
      note: true,
      group: { select: { name: true } },
    },
  });

  const result = await prisma.scheduleEntry.updateMany({
    where: {
      approval: "PENDING",
      ...(groupId ? { groupId } : {}),
    },
    data: { approval: "APPROVED" },
  });

  if (result.count > 0) {
    type Accumulator = {
      groupName: string;
      teacherIds: Set<string>;
      teacherNames: Set<string>;
      lines: string[];
    };
    const byGroup = new Map<string, Accumulator>();
    for (const entry of pending) {
      const current =
        byGroup.get(entry.groupId) ??
        {
          groupName: entry.group?.name ?? "",
          teacherIds: new Set<string>(),
          teacherNames: new Set<string>(),
          lines: [],
        };
      if (entry.teacherId) current.teacherIds.add(entry.teacherId);
      if (entry.teacher) current.teacherNames.add(entry.teacher);
      current.lines.push(
        scheduleLine({
          action: "approved",
          dayOfWeek: entry.dayOfWeek,
          slot: entry.slot,
          subject: entry.subject,
          room: entry.room,
          groupName: current.groupName,
          status: entry.status,
          note: entry.note,
        }),
      );
      byGroup.set(entry.groupId, current);
    }
    await sendScheduleNotices(
      [...byGroup.entries()].map(([pendingGroupId, current]) => ({
        groupId: pendingGroupId,
        groupName: current.groupName,
        teacherIds: [...current.teacherIds],
        teacherNames: [...current.teacherNames],
        lines: capNoticeLines(current.lines),
      })),
      { title: "📢 <b>Jadval tasdiqlandi</b>" },
    );

    await recordEvent(user.id, "schedule.approve_all", {
      entity: "ScheduleEntry",
      meta: { count: result.count, groupId },
    });
  }

  return Response.json({ ok: true, data: { count: result.count } });
}
