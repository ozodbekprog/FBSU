import "server-only";
import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { agentChatStep, type AiAgentMessage, type AiTool } from "@/lib/ai";
import { attendanceCounts } from "@/app/api/attendance/summary/data";
import {
  attendanceRowsByStudent,
  clampDay,
  clampInt,
  gradeRowsByStudent,
  percentOf,
  SLOT_TIMES,
  STATUS_UZ,
  weekdayLabel,
} from "./data";

/**
 * AI agent — MVP (o'qish bosqichi).
 * Tool'lar foydalanuvchi huquqi doirasida ishlaydi: talaba faqat o'zini,
 * o'qituvchi faqat o'z kurs/guruhlarini ko'radi. Yozuvchi tool'lar keyingi bosqichda.
 */

export type AgentUser = { id: string; role: string; groupId: string | null };
type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_STEPS = 2;
const MAX_TOOL_CHARS = 2200;
const AGENT_TASK =
  "Tizimdan ma'lumot olish kerak bo'lsa (davomat, baho, jadval, muddat, guruh) — tool'lardan foydalan. " +
  "Tool natijasidagi aniq raqamlarga tayan, o'zingdan raqam to'qima. Yozish/o'zgartirish hozircha yo'q — " +
  "kerak bo'lsa mos sahifani ko'rsat.";

function cap(text: string): string {
  return text.length > MAX_TOOL_CHARS ? `${text.slice(0, MAX_TOOL_CHARS)}…` : text;
}

function fmtDate(value: Date): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

function quizMax(questions: { points: number }[]): number {
  const sum = questions.reduce((total, question) => total + question.points, 0);
  return sum > 0 ? sum : 100;
}

/** TEACHER uchun o'z kurslari ID lari; ADMIN uchun null (= cheklovsiz). */
async function myCourseIds(user: AgentUser): Promise<string[] | null> {
  if (user.role === "ADMIN") return null;
  const courses = await prisma.course.findMany({
    where: { teacherId: user.id },
    select: { id: true },
    take: 200,
  });
  return courses.map((course) => course.id);
}

async function accessibleGroups(user: AgentUser) {
  if (user.role === "ADMIN") {
    return prisma.group.findMany({
      orderBy: { name: "asc" },
      take: 80,
      select: { id: true, name: true, year: true },
    });
  }
  const [bySchedule, byPlan] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: { teacherId: user.id },
      select: { groupId: true },
      distinct: ["groupId"],
      take: 200,
    }),
    prisma.studyPlan.findMany({
      where: { course: { teacherId: user.id } },
      select: { groupId: true },
      distinct: ["groupId"],
      take: 200,
    }),
  ]);
  const ids = [...new Set([...bySchedule, ...byPlan].map((row) => row.groupId))];
  if (ids.length === 0) return [];
  return prisma.group.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, year: true },
  });
}

async function findGroup(user: AgentUser, name: string) {
  const query = name.trim().toLowerCase();
  if (!query) return null;
  const groups = await accessibleGroups(user);
  return (
    groups.find((group) => group.name.toLowerCase() === query) ??
    groups.find((group) => group.name.toLowerCase().includes(query)) ??
    null
  );
}

async function groupNotFound(user: AgentUser): Promise<string> {
  const groups = await accessibleGroups(user);
  if (groups.length === 0) return "Guruh topilmadi — sizga biriktirilgan guruh yo'q.";
  return `Guruh topilmadi yoki sizga tegishli emas. Mavjud guruhlarim: ${groups
    .map((group) => group.name)
    .slice(0, 20)
    .join(", ")}`;
}

function groupStudents(groupId: string) {
  return prisma.user.findMany({
    where: { groupId, role: "STUDENT", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 80,
  });
}

function groupOfDay<T extends { dayOfWeek: number; slot: number }>(rows: T[]): Map<number, T[]> {
  const byDay = new Map<number, T[]>();
  for (const row of rows) {
    const list = byDay.get(row.dayOfWeek);
    if (list) list.push(row);
    else byDay.set(row.dayOfWeek, [row]);
  }
  return byDay;
}

// ---------- Talaba tool'lari ----------

async function toolMyAttendance(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  const days = clampInt(args.kun, 30, 1, 365);
  const since = new Date(Date.now() - days * 86_400_000);
  const records = await prisma.attendance.findMany({
    where: { studentId: user.id, date: { gte: since } },
    select: { status: true, date: true, course: { select: { title: true } } },
    orderBy: { date: "desc" },
    take: 400,
  });
  if (records.length === 0) return `Oxirgi ${days} kun ichida davomat yozuvlari yo'q.`;
  const total = attendanceCounts(records.map((record) => record.status));
  const byCourse = new Map<string, AttendanceStatus[]>();
  for (const record of records) {
    const list = byCourse.get(record.course.title);
    if (list) list.push(record.status);
    else byCourse.set(record.course.title, [record.status]);
  }
  const courseLines = [...byCourse.entries()]
    .map(([title, statuses]) => ({ title, ...attendanceCounts(statuses) }))
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 10)
    .map((row) => `- ${row.title}: ${row.percent}% (${row.total} yozuv)`);
  const recent = records
    .slice(0, 5)
    .map((record) => `${fmtDate(record.date)} ${record.course.title} — ${STATUS_UZ[record.status]}`);
  return [
    `Oxirgi ${days} kun: ${total.total} yozuv.`,
    `Qatnashish: ${total.percent}%. Qatnashdi: ${total.present}, kechikdi: ${total.late}, kelmadi: ${total.absent}, sababli: ${total.excused}.`,
    total.eligible
      ? "Imtihonga kirish chegarasi (80%) yetadi."
      : "Imtihonga kirish chegarasi (80%) yetmaydi!",
    "Kurslar bo'yicha (eng pastdan):",
    ...courseLines,
    "Oxirgi yozuvlar:",
    ...recent,
  ].join("\n");
}

async function toolMyGrades(user: AgentUser): Promise<string> {
  const [attempts, submissions] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: {
        studentId: user.id,
        score: { not: null },
        finishedAt: { not: null },
        quiz: { isPublished: true },
      },
      select: {
        score: true,
        quiz: {
          select: {
            title: true,
            course: { select: { title: true } },
            questions: { select: { points: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 40,
    }),
    prisma.submission.findMany({
      where: { studentId: user.id, score: { not: null } },
      select: {
        score: true,
        assignment: {
          select: {
            title: true,
            maxScore: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 40,
    }),
  ]);
  const items = [
    ...attempts.map((attempt) => ({
      label: `${attempt.quiz.title} (${attempt.quiz.course.title})`,
      percent: percentOf(attempt.score ?? 0, quizMax(attempt.quiz.questions)),
    })),
    ...submissions.map((submission) => ({
      label: `${submission.assignment.title} (${submission.assignment.course.title})`,
      percent: percentOf(submission.score ?? 0, submission.assignment.maxScore || 100),
    })),
  ];
  if (items.length === 0) return "Hozircha baholangan ishlar yo'q.";
  const average = Math.round(items.reduce((sum, item) => sum + item.percent, 0) / items.length);
  const lines = items.slice(0, 10).map((item) => `- ${item.label}: ${item.percent}%`);
  return [`O'rtacha natija: ${average}% (${items.length} ta baholangan ish).`, "Oxirgi natijalar:", ...lines].join(
    "\n",
  );
}

async function toolMySchedule(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  if (!user.groupId) return "Sizga guruh biriktirilmagan — jadvalni ko'rish uchun guruhingizni tekshiring.";
  const day = clampDay(args.kun);
  const entries = await prisma.scheduleEntry.findMany({
    where: {
      groupId: user.groupId,
      status: { not: "CANCELLED" },
      ...(day ? { dayOfWeek: day } : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    take: 80,
    select: { dayOfWeek: true, slot: true, subject: true, room: true, teacher: true, lessonType: true },
  });
  if (entries.length === 0) {
    return day ? `${weekdayLabel(day)} kuni dars yo'q.` : "Jadvalda darslar topilmadi.";
  }
  const byDay = groupOfDay(entries);
  const lines = [...byDay.entries()].map(([dayNumber, dayEntries]) => {
    const lessons = dayEntries
      .map((entry) => {
        const time = SLOT_TIMES[entry.slot] ?? "";
        const room = entry.room ? `, ${entry.room}` : "";
        const teacher = entry.teacher ? `, ${entry.teacher}` : "";
        return `${entry.slot}-par ${entry.subject}${room}${teacher}${time ? ` (${time})` : ""}`;
      })
      .join("; ");
    return `${weekdayLabel(dayNumber)}: ${lessons}`;
  });
  return `Jadval (jami ${entries.length} dars):\n${lines.join("\n")}`;
}

async function toolMyDeadlines(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  const days = clampInt(args.kun, 14, 1, 60);
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { courseId: true },
    take: 100,
  });
  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  if (courseIds.length === 0) return "Faol kurslarga yozilmagansiz.";
  const [assignments, quizzes] = await Promise.all([
    prisma.assignment.findMany({
      where: { courseId: { in: courseIds }, dueAt: { gte: now, lte: until } },
      select: {
        title: true,
        dueAt: true,
        course: { select: { title: true } },
        submissions: { where: { studentId: user.id }, select: { id: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 30,
    }),
    prisma.quiz.findMany({
      where: { courseId: { in: courseIds }, isPublished: true, dueAt: { gte: now, lte: until } },
      select: {
        title: true,
        dueAt: true,
        course: { select: { title: true } },
        attempts: { where: { studentId: user.id, finishedAt: { not: null } }, select: { id: true } },
      },
      orderBy: { dueAt: "asc" },
      take: 30,
    }),
  ]);
  if (assignments.length === 0 && quizzes.length === 0) {
    return `Keyingi ${days} kunda muddati keladigan topshiriq/test yo'q.`;
  }
  const lines = [
    ...assignments.map(
      (assignment) =>
        `- ${fmtDate(assignment.dueAt ?? now)} ${assignment.title} (${assignment.course.title}) — topshiriq ${
          assignment.submissions.length > 0 ? "topshirilgan ✓" : "TOPSHIRILMAGAN"
        }`,
    ),
    ...quizzes.map(
      (quiz) =>
        `- ${fmtDate(quiz.dueAt ?? now)} ${quiz.title} (${quiz.course.title}) — test ${
          quiz.attempts.length > 0 ? "ishlangan ✓" : "ISHLANMAGAN"
        }`,
    ),
  ];
  return `Keyingi ${days} kun muddatlari:\n${lines.join("\n")}`;
}

// ---------- O'qituvchi tool'lari ----------

async function toolTeacherSchedule(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  if (user.role === "ADMIN") {
    return "Administrator uchun shaxsiy dars jadvali yo'q. Guruh nomini aytsangiz — davomati va baholarini ko'rsataman.";
  }
  const day = clampDay(args.kun);
  const entries = await prisma.scheduleEntry.findMany({
    where: {
      teacherId: user.id,
      status: { not: "CANCELLED" },
      ...(day ? { dayOfWeek: day } : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { slot: "asc" }],
    take: 80,
    select: {
      dayOfWeek: true,
      slot: true,
      subject: true,
      room: true,
      group: { select: { name: true } },
    },
  });
  if (entries.length === 0) {
    return day ? `${weekdayLabel(day)} kuni darsingiz yo'q.` : "Jadvalingizda darslar topilmadi.";
  }
  const byDay = groupOfDay(entries);
  const lines = [...byDay.entries()].map(([dayNumber, dayEntries]) => {
    const lessons = dayEntries
      .map((entry) => {
        const time = SLOT_TIMES[entry.slot] ?? "";
        return `${entry.slot}-par ${entry.subject} — ${entry.group?.name ?? "?"}${entry.room ? `, ${entry.room}` : ""}${time ? ` (${time})` : ""}`;
      })
      .join("; ");
    return `${weekdayLabel(dayNumber)}: ${lessons}`;
  });
  return `Dars jadvalingiz (jami ${entries.length}):\n${lines.join("\n")}`;
}

async function toolTeacherGroups(user: AgentUser): Promise<string> {
  const groups = await accessibleGroups(user);
  if (groups.length === 0) {
    return user.role === "ADMIN"
      ? "Guruhlar topilmadi."
      : "Sizga biriktirilgan guruh topilmadi (jadval va o'quv rejalari bo'yicha).";
  }
  const counts = await prisma.user.groupBy({
    by: ["groupId"],
    where: {
      groupId: { in: groups.map((group) => group.id) },
      role: "STUDENT",
      isActive: true,
    },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((row) => [row.groupId, row._count._all]));
  const lines = groups
    .slice(0, 30)
    .map((group) => `- ${group.name}${group.year ? ` (${group.year}-yil)` : ""}: ${countMap.get(group.id) ?? 0} talaba`);
  return `Guruhlarim (${groups.length} ta):\n${lines.join("\n")}`;
}

async function toolGroupStudents(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  const name = typeof args.guruh === "string" ? args.guruh : "";
  if (!name.trim()) return "Guruh nomini ko'rsating.";
  const group = await findGroup(user, name);
  if (!group) return groupNotFound(user);
  const students = await groupStudents(group.id);
  if (students.length === 0) return `${group.name} guruhida faol talaba yo'q.`;
  const lines = students.slice(0, 60).map((student, index) => `${index + 1}. ${student.name}`);
  return `${group.name} guruhi — ${students.length} ta faol talaba:\n${lines.join("\n")}`;
}

async function toolGroupAttendance(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  const name = typeof args.guruh === "string" ? args.guruh : "";
  if (!name.trim()) return "Guruh nomini ko'rsating.";
  const group = await findGroup(user, name);
  if (!group) return groupNotFound(user);
  const days = clampInt(args.kun, 30, 1, 180);
  const students = await groupStudents(group.id);
  if (students.length === 0) return `${group.name} guruhida faol talaba yo'q.`;
  const courseIds = await myCourseIds(user);
  const since = new Date(Date.now() - days * 86_400_000);
  const records = await prisma.attendance.findMany({
    where: {
      studentId: { in: students.map((student) => student.id) },
      date: { gte: since },
      ...(courseIds ? { courseId: { in: courseIds } } : {}),
    },
    select: { studentId: true, status: true },
    take: 4000,
  });
  if (records.length === 0) return `${group.name}: oxirgi ${days} kunda davomat yozuvlari topilmadi.`;
  const rows = attendanceRowsByStudent(students, records);
  const average = Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length);
  const low = rows.filter((row) => !row.eligible);
  const lines = rows
    .slice(0, 40)
    .map((row) => `- ${row.name}: ${row.percent}% (qatnashdi ${row.present + row.late}, kelmadi ${row.absent}, sababli ${row.excused})`);
  return [
    `${group.name} — oxirgi ${days} kun davomati. O'rtacha: ${average}%.`,
    `80% chegaradan past: ${low.length} talaba.`,
    ...lines,
  ].join("\n");
}

async function toolGroupGrades(user: AgentUser, args: Record<string, unknown>): Promise<string> {
  const name = typeof args.guruh === "string" ? args.guruh : "";
  if (!name.trim()) return "Guruh nomini ko'rsating.";
  const group = await findGroup(user, name);
  if (!group) return groupNotFound(user);
  const students = await groupStudents(group.id);
  if (students.length === 0) return `${group.name} guruhida faol talaba yo'q.`;
  const studentIds = students.map((student) => student.id);
  const courseIds = await myCourseIds(user);
  const courseFilter = courseIds ? { courseId: { in: courseIds } } : {};
  const [submissions, attempts] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId: { in: studentIds }, score: { not: null }, assignment: courseFilter },
      select: { studentId: true, score: true, assignment: { select: { maxScore: true } } },
      take: 2000,
    }),
    prisma.quizAttempt.findMany({
      where: {
        studentId: { in: studentIds },
        score: { not: null },
        finishedAt: { not: null },
        quiz: { isPublished: true, ...courseFilter },
      },
      select: {
        studentId: true,
        score: true,
        quiz: { select: { questions: { select: { points: true } } } },
      },
      take: 2000,
    }),
  ]);
  const items = [
    ...submissions.map((submission) => ({
      studentId: submission.studentId,
      percent: percentOf(submission.score ?? 0, submission.assignment.maxScore || 100),
    })),
    ...attempts.map((attempt) => ({
      studentId: attempt.studentId,
      percent: percentOf(attempt.score ?? 0, quizMax(attempt.quiz.questions)),
    })),
  ];
  if (items.length === 0) return `${group.name}: baholangan ishlar topilmadi.`;
  const rows = gradeRowsByStudent(students, items);
  const graded = rows.filter((row) => row.percent >= 0);
  const average =
    graded.length > 0 ? Math.round(graded.reduce((sum, row) => sum + row.percent, 0) / graded.length) : 0;
  const low = rows.filter((row) => row.low);
  const lines = rows
    .slice(0, 40)
    .map((row) => `- ${row.name}: ${row.percent < 0 ? "ma'lumot yo'q" : `${row.percent}% (${row.count} ish)`}`);
  return [
    `${group.name} — baholar. O'rtacha: ${average}% (${graded.length}/${rows.length} talaba baholangan).`,
    `60% dan past: ${low.length} talaba.`,
    ...lines,
  ].join("\n");
}

// ---------- Tool ro'yxati ----------

const STUDENT_TOOLS: AiTool[] = [
  {
    type: "function",
    function: {
      name: "davomatim",
      description: "Talabaning o'z davomatini ko'rsatadi: foiz, holatlar, kurslar kesimi, oxirgi yozuvlar.",
      parameters: {
        type: "object",
        properties: { kun: { type: "number", description: "Oxirgi necha kun (1-365). Standart: 30" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "baholarim",
      description: "Talabaning baholangan test va topshiriq natijalarini ko'rsatadi (foizda).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "jadvalim",
      description: "Talabaning guruh dars jadvali (haftalik yoki bitta kun).",
      parameters: {
        type: "object",
        properties: { kun: { type: "number", description: "Hafta kuni: 1=dushanba ... 7=yakshanba. Bo'sh qoldirilsa — butun hafta" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "muddatlarim",
      description: "Yaqin kunlarda muddati tugaydigan topshiriq va testlar hamda ularning bajarilganligi.",
      parameters: {
        type: "object",
        properties: { kun: { type: "number", description: "Necha kun oldinga qarash (1-60). Standart: 14" } },
      },
    },
  },
];

const TEACHER_TOOLS: AiTool[] = [
  {
    type: "function",
    function: {
      name: "darslarim",
      description: "O'qituvchining dars jadvali (haftalik yoki bitta kun), guruhlar bilan.",
      parameters: {
        type: "object",
        properties: { kun: { type: "number", description: "Hafta kuni: 1=dushanba ... 7=yakshanba. Bo'sh qoldirilsa — butun hafta" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "guruhlarim",
      description: "O'qituvchiga biriktirilgan guruhlar va ulardagi talabalar soni.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "guruh_talabalari",
      description: "Guruhdagi faol talabalar ro'yxati.",
      parameters: {
        type: "object",
        properties: { guruh: { type: "string", description: "Guruh nomi (masalan, 21-KI)" } },
        required: ["guruh"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "guruh_davomati",
      description: "Guruh davomati: talabalar bo'yicha foiz, 80% chegaradan pastlar ro'yxati.",
      parameters: {
        type: "object",
        properties: {
          guruh: { type: "string", description: "Guruh nomi" },
          kun: { type: "number", description: "Oxirgi necha kun (1-180). Standart: 30" },
        },
        required: ["guruh"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "guruh_baholari",
      description: "Guruh baholari: talabalar bo'yicha o'rtacha foiz, 60% dan pastlar ro'yxati.",
      parameters: {
        type: "object",
        properties: { guruh: { type: "string", description: "Guruh nomi" } },
        required: ["guruh"],
      },
    },
  },
];

export async function buildAssistantTools(
  user: AgentUser,
): Promise<{ tools: AiTool[]; execute: (name: string, args: Record<string, unknown>) => Promise<string> }> {
  const isStudent = user.role === "STUDENT";
  const handlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = isStudent
    ? {
        davomatim: (args) => toolMyAttendance(user, args),
        baholarim: () => toolMyGrades(user),
        jadvalim: (args) => toolMySchedule(user, args),
        muddatlarim: (args) => toolMyDeadlines(user, args),
      }
    : {
        darslarim: (args) => toolTeacherSchedule(user, args),
        guruhlarim: () => toolTeacherGroups(user),
        guruh_talabalari: (args) => toolGroupStudents(user, args),
        guruh_davomati: (args) => toolGroupAttendance(user, args),
        guruh_baholari: (args) => toolGroupGrades(user, args),
      };
  return {
    tools: isStudent ? STUDENT_TOOLS : TEACHER_TOOLS,
    execute: async (name, args) => {
      const handler = handlers[name];
      if (!handler) return "Xato: bunday tool mavjud emas.";
      try {
        return cap(await handler(args));
      } catch {
        return "Xato: ma'lumotni olishda muammo bo'ldi.";
      }
    },
  };
}

/**
 * Agent siklini ishga tushiradi. Model null qaytarsa (kalit yo'q, xato) — null,
 * shunda chaqiruvchi oddiy fallback'ka o'tadi.
 */
export async function runAssistantAgent(input: {
  user: AgentUser;
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<string | null> {
  const { user, systemPrompt, messages } = input;
  if (messages.length === 0) return null;
  const { tools, execute } = await buildAssistantTools(user);
  const convo: AiAgentMessage[] = [
    { role: "system", content: `${systemPrompt}\n\nAGENT: ${AGENT_TASK}` },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ];
  for (let step = 0; step <= MAX_STEPS; step++) {
    const withTools = step < MAX_STEPS && tools.length > 0;
    const result = await agentChatStep(convo, withTools ? tools : [], {
      maxTokens: withTools ? 600 : 500,
      timeoutMs: 20000,
    });
    if (!result) return null;
    if (result.toolCalls.length === 0) return result.message.content;
    convo.push(result.message);
    for (const call of result.toolCalls) {
      const output = await execute(call.name, call.args);
      convo.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }
  return null;
}
