import { prisma } from "@/lib/prisma";
import { finalizeExpiredAttendanceSessions } from "@/modules/attendance/auto-close";
import { collectDueSoonReminders, type ReminderCandidate } from "@/modules/cron/reminders";
import { recordEvent } from "@/modules/events/record";

const WINDOW_HOURS = 24;
const DAY_MS = 24 * 3600 * 1000;

type NotificationRow = {
  userId: string;
  title: string;
  body: string;
  link: string;
};

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const finalized = await finalizeExpiredAttendanceSessions();

    const rows = await prisma.assignment.findMany({
      where: {
        dueAt: {
          gt: now,
          lte: new Date(now.getTime() + WINDOW_HOURS * 3600 * 1000),
        },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        courseId: true,
        course: { select: { slug: true } },
      },
      orderBy: { dueAt: "asc" },
    });

    const candidates: ReminderCandidate[] = rows.flatMap((row) =>
      row.dueAt
        ? [
            {
              assignmentId: row.id,
              dueAt: row.dueAt,
              title: row.title,
              courseSlug: row.course.slug,
            },
          ]
        : [],
    );
    const courseIdByAssignment = new Map(rows.map((row) => [row.id, row.courseId]));
    const dueSoon = collectDueSoonReminders(candidates, { hours: WINDOW_HOURS, now });

    const pending: NotificationRow[] = [];
    for (const candidate of dueSoon) {
      const courseId = courseIdByAssignment.get(candidate.assignmentId);
      if (!courseId) continue;

      const enrollments = await prisma.enrollment.findMany({
        where: { courseId, status: "ACTIVE" },
        select: { userId: true },
      });

      const link = `/courses/${candidate.courseSlug}/assignments/${candidate.assignmentId}`;
      const body = `«${candidate.title}» — ${candidate.dueAt.toLocaleString("uz-UZ")} gacha topshirish kerak`;

      for (const enrollment of enrollments) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: enrollment.userId,
            link: { endsWith: `/assignments/${candidate.assignmentId}` },
            createdAt: { gte: new Date(now.getTime() - DAY_MS) },
          },
          select: { id: true },
        });
        if (existing) continue;

        pending.push({
          userId: enrollment.userId,
          title: "Topshiriq muddati yaqinlashmoqda",
          body,
          link,
        });
      }
    }

    const reminders =
      pending.length > 0
        ? (await prisma.notification.createMany({ data: pending, skipDuplicates: true })).count
        : 0;

    const ownerCount = await prisma.user.count({ where: { role: "OWNER", isActive: true } });
    const guardRows = await prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger WHERE tgname = 'protect_owner_user_trigger'
    `;
    const ownerGuard: "ok" | "fail" = ownerCount >= 1 && guardRows.length > 0 ? "ok" : "fail";

    await recordEvent(null, "system.cron", { meta: { finalized, reminders, ownerGuard } });

    return Response.json({ ok: true, data: { finalized, reminders, ownerGuard } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron vazifasida xato";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
