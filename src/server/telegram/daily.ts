import "server-only";
import { prisma } from "@/lib/prisma";
import {
  dailyReminderText,
  matchCourseSlug,
  normalizeTeacher,
  parityFilter,
  tashkentDayEnd,
  tashkentNow,
  tashkentStartOfDay,
  type DailyDeadline,
  type DailyExam,
  type RichEntry,
  type TeacherLesson,
} from "./rich";
import {
  MESSAGE_EFFECTS,
  appUrl,
  reminderKeyboard,
  sendRichBotMessage,
  sendTyping,
  telegramConfigured,
} from "./send";

const REMINDER_HOUR = 7;
const SEND_CONCURRENCY = 5;

type TargetUser = {
  id: string;
  name: string;
  role: string;
  telegramId: string | null;
  groupId: string | null;
  group: { name: string } | null;
};

type ScheduleRow = {
  groupId: string;
  teacherId: string | null;
  teacher: string | null;
  dayOfWeek: number;
  slot: number;
  subject: string;
  room: string | null;
  lessonType: string | null;
  note: string | null;
  status: string;
  group: { name: string } | null;
};

function toRich(entry: ScheduleRow): RichEntry {
  return {
    dayOfWeek: entry.dayOfWeek,
    slot: entry.slot,
    subject: entry.subject,
    room: entry.room,
    teacher: entry.teacher,
    lessonType: entry.lessonType,
    note: entry.note,
    status: entry.status,
    groupName: entry.group?.name ?? null,
  };
}

function examTime(startTime: string | null, endTime: string | null): string {
  if (!startTime) return "";
  return endTime ? `${startTime}–${endTime}` : startTime;
}

function addUnique<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export type DailyTelegramResult = {
  total: number;
  sent: number;
  failed: number;
  skipped: string;
  hour: number;
};

export async function sendDailyTelegramReminders(options: { force?: boolean } = {}): Promise<DailyTelegramResult> {
  const tashkent = tashkentNow();
  if (!telegramConfigured()) {
    return { total: 0, sent: 0, failed: 0, skipped: "token-yoq", hour: tashkent.hour };
  }
  if (!options.force && (tashkent.hour < REMINDER_HOUR || tashkent.hour > REMINDER_HOUR + 1)) {
    return { total: 0, sent: 0, failed: 0, skipped: "vaqti-emas", hour: tashkent.hour };
  }

  const dayStart = tashkentStartOfDay(0);
  const dayEnd = tashkentDayEnd(0);
  const dow = tashkent.dow;

  const users = (await prisma.user.findMany({
    where: {
      telegramId: { not: null },
      isActive: true,
      role: { in: ["STUDENT", "TEACHER"] },
    },
    select: {
      id: true,
      name: true,
      role: true,
      telegramId: true,
      groupId: true,
      group: { select: { name: true } },
    },
  })) as TargetUser[];
  if (users.length === 0) {
    return { total: 0, sent: 0, failed: 0, skipped: "foydalanuvchi-yoq", hour: tashkent.hour };
  }

  const studentIds = users.filter((user) => user.role === "STUDENT").map((user) => user.id);
  const teacherIds = users.filter((user) => user.role === "TEACHER").map((user) => user.id);

  const [entries, courses, enrollments] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: { dayOfWeek: dow, ...parityFilter(dayStart) },
      orderBy: { slot: "asc" },
      select: {
        groupId: true,
        teacherId: true,
        teacher: true,
        dayOfWeek: true,
        slot: true,
        subject: true,
        room: true,
        lessonType: true,
        note: true,
        status: true,
        group: { select: { name: true } },
      },
    }),
    prisma.course.findMany({
      select: { id: true, title: true, slug: true, teacherId: true },
    }),
    studentIds.length > 0
      ? prisma.enrollment.findMany({
          where: { userId: { in: studentIds } },
          select: { userId: true, courseId: true },
        })
      : Promise.resolve([]),
  ]);

  const schedule = entries as ScheduleRow[];
  const entriesByGroup = new Map<string, ScheduleRow[]>();
  const entriesByTeacher = new Map<string, ScheduleRow[]>();
  const entriesByTeacherName = new Map<string, ScheduleRow[]>();
  for (const entry of schedule) {
    addUnique(entriesByGroup, entry.groupId, entry);
    if (entry.teacherId) addUnique(entriesByTeacher, entry.teacherId, entry);
    if (entry.teacher) addUnique(entriesByTeacherName, normalizeTeacher(entry.teacher), entry);
  }

  const enrollmentsByStudent = new Map<string, Set<string>>();
  for (const row of enrollments) {
    const set = enrollmentsByStudent.get(row.userId) ?? new Set<string>();
    set.add(row.courseId);
    enrollmentsByStudent.set(row.userId, set);
  }

  const coursesByTeacher = new Map<string, { id: string; title: string; slug: string }[]>();
  for (const course of courses) {
    if (!course.teacherId) continue;
    addUnique(coursesByTeacher, course.teacherId, {
      id: course.id,
      title: course.title,
      slug: course.slug,
    });
  }

  const relevantCourseIds = new Set<string>();
  for (const set of enrollmentsByStudent.values()) {
    for (const courseId of set) relevantCourseIds.add(courseId);
  }
  for (const teacherId of teacherIds) {
    for (const course of coursesByTeacher.get(teacherId) ?? []) relevantCourseIds.add(course.id);
  }
  const courseIds = [...relevantCourseIds];

  const [assignments, quizzes, exams] = await Promise.all([
    courseIds.length > 0
      ? prisma.assignment.findMany({
          where: { courseId: { in: courseIds }, dueAt: { gte: dayStart, lt: dayEnd } },
          orderBy: { dueAt: "asc" },
          select: {
            title: true,
            dueAt: true,
            courseId: true,
            course: { select: { title: true } },
            submissions: { select: { studentId: true } },
          },
        })
      : Promise.resolve([]),
    courseIds.length > 0
      ? prisma.quiz.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
            dueAt: { gte: dayStart, lt: dayEnd },
          },
          orderBy: { dueAt: "asc" },
          select: {
            title: true,
            dueAt: true,
            courseId: true,
            course: { select: { title: true } },
            attempts: {
              where: { finishedAt: { not: null } },
              select: { studentId: true },
            },
          },
        })
      : Promise.resolve([]),
    courseIds.length > 0
      ? prisma.examSession.findMany({
          where: { courseId: { in: courseIds }, date: { gte: dayStart, lt: dayEnd } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          select: {
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            room: true,
            courseId: true,
            course: { select: { title: true } },
            sheets: { select: { studentId: true, status: true, seat: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  let sent = 0;
  let failed = 0;

  await mapLimit(users, SEND_CONCURRENCY, async (user) => {
    if (!user.telegramId) return;
    try {
      const isTeacher = user.role === "TEACHER";
      const userCourseIds = isTeacher
        ? new Set((coursesByTeacher.get(user.id) ?? []).map((course) => course.id))
        : (enrollmentsByStudent.get(user.id) ?? new Set<string>());

      const groupRows = user.groupId ? (entriesByGroup.get(user.groupId) ?? []) : [];
      const teacherRows = isTeacher
        ? Array.from(
            new Set([
              ...(entriesByTeacher.get(user.id) ?? []),
              ...(entriesByTeacherName.get(normalizeTeacher(user.name)) ?? []),
            ]),
          )
        : [];

      const teacherLessons: TeacherLesson[] = teacherRows.map((entry) => ({
        entry: toRich(entry),
        groupName: entry.group?.name ?? "",
        slug: matchCourseSlug(entry.subject, coursesByTeacher.get(user.id) ?? []),
      }));

      const deadlines: DailyDeadline[] = [];
      for (const assignment of assignments) {
        if (!assignment.dueAt || !userCourseIds.has(assignment.courseId)) continue;
        if (!isTeacher && assignment.submissions.some((row) => row.studentId === user.id)) continue;
        deadlines.push({
          text: `Topshiriq: ${assignment.title} — ${assignment.course.title}`,
          dueAt: assignment.dueAt,
        });
      }
      for (const quiz of quizzes) {
        if (!quiz.dueAt || !userCourseIds.has(quiz.courseId)) continue;
        if (!isTeacher && quiz.attempts.some((row) => row.studentId === user.id)) continue;
        deadlines.push({
          text: `Test: ${quiz.title} — ${quiz.course.title}`,
          dueAt: quiz.dueAt,
        });
      }
      deadlines.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

      const dailyExams: DailyExam[] = [];
      for (const session of exams) {
        if (!userCourseIds.has(session.courseId)) continue;
        if (isTeacher) {
          dailyExams.push({
            course: session.course.title,
            title: session.title,
            room: session.room,
            time: examTime(session.startTime, session.endTime),
            sheets: session.sheets.length,
            graded: session.sheets.filter((row) => row.status !== "PENDING").length,
          });
          continue;
        }
        const sheet = session.sheets.find((row) => row.studentId === user.id);
        dailyExams.push({
          course: session.course.title,
          title: session.title,
          room: session.room,
          time: examTime(session.startTime, session.endTime),
          seat: sheet?.seat ?? null,
          permitted: Boolean(sheet && sheet.status !== "FAILED" && sheet.status !== "ABSENT"),
        });
      }

      const text = dailyReminderText(
        user,
        dayStart,
        groupRows.map(toRich),
        deadlines,
        teacherLessons,
        dailyExams,
        appUrl(),
      );
      await sendTyping(user.telegramId);
      await sendRichBotMessage(user.telegramId, text, {
        ...reminderKeyboard(),
        message_effect_id:
          dailyExams.length > 0 ? MESSAGE_EFFECTS.fire : MESSAGE_EFFECTS.confetti,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("[telegram-daily]", user.id, error instanceof Error ? error.message : error);
    }
  });

  return { total: users.length, sent, failed, skipped: "", hour: tashkent.hour };
}
