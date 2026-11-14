import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyGroupStudents } from "@/server/notify";
import { recordEvent } from "@/modules/events/record";
import { scheduleLine, sendScheduleNotices } from "@/server/telegram/schedule-notify";
import { canApproveSchedule } from "../../_helpers";

const STATUS_TITLES = {
  NORMAL: "Dars jadvalga qo'shildi",
  CHANGED: "Dars o'zgardi",
  MOVED: "Dars ko'chirildi",
  CANCELLED: "Dars bekor qilindi",
} as const;

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!canApproveSchedule(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const entry = await prisma.scheduleEntry.findUnique({ where: { id } });
  if (!entry) {
    return Response.json({ ok: false, error: "Jadval yozuvi topilmadi" }, { status: 404 });
  }

  if (entry.approval === "APPROVED") {
    return Response.json({ ok: true, data: entry });
  }

  const updated = await prisma.scheduleEntry.update({
    where: { id },
    data: { approval: "APPROVED" },
    include: {
      subjectRef: { select: { name: true, color: true } },
      teacherRef: { select: { id: true, name: true } },
      group: { select: { name: true } },
    },
  });

  await sendScheduleNotices(
    [
      {
        groupId: updated.groupId,
        groupName: updated.group?.name ?? "",
        teacherIds: updated.teacherId ? [updated.teacherId] : [],
        teacherNames: updated.teacher ? [updated.teacher] : [],
        lines: [
          scheduleLine({
            action: "approved",
            dayOfWeek: updated.dayOfWeek,
            slot: updated.slot,
            subject: updated.subject,
            room: updated.room,
            groupName: updated.group?.name ?? "",
            status: updated.status,
            note: updated.note,
          }),
        ],
      },
    ],
    { title: "📢 <b>Jadval yangilandi</b>" },
  );

  if (updated.status !== "NORMAL") {
    await notifyGroupStudents(updated.groupId, {
      title: `${STATUS_TITLES[updated.status]}: ${updated.subject}`,
      body: updated.status === "CANCELLED" && updated.note ? updated.note : undefined,
      link: "/schedule",
    });
  }

  await recordEvent(user.id, "schedule.approve", {
    entity: "ScheduleEntry",
    entityId: updated.id,
    meta: { subject: updated.subject, groupId: updated.groupId, status: updated.status },
  });

  return Response.json({ ok: true, data: updated });
}
