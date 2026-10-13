import { z } from "zod";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { finalizeExpiredAttendanceSessions } from "@/modules/attendance/auto-close";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const DEFAULT_MINUTES = 15;

const createSchema = z.object({
  courseId: z.string().min(1),
  minutes: z.number().int().min(1).max(180).optional(),
  exception: z.boolean().optional(),
  kind: z.enum(["CHECK_IN", "CHECK_OUT"]).optional(),
});

function generateCode() {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

async function uniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateCode();
    const existing = await prisma.attendanceSession.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return null;
}

function startOfToday() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const sessionRateLimit = await checkRateLimit(`attendance:session:${user.id}`, {
    windowMs: 600_000,
    maxAttempts: 15,
    keyPrefix: "api",
  });
  if (!sessionRateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p sessiya. Keyinroq qayta urinib ko'ring" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { OR: [{ id: parsed.data.courseId }, { slug: parsed.data.courseId }] },
  });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const code = await uniqueCode();
  if (!code) {
    return Response.json({ ok: false, error: "Kod yaratishda xatolik" }, { status: 500 });
  }

  const now = new Date();
  const minutes = parsed.data.minutes ?? DEFAULT_MINUTES;
  const expiresAt = new Date(now.getTime() + minutes * 60_000);

  const session = await prisma.$transaction(async (tx) => {
    await tx.attendanceSession.updateMany({
      where: { courseId: course.id, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });
    return tx.attendanceSession.create({
      data: {
        courseId: course.id,
        date: startOfToday(),
        code,
        expiresAt,
        createdById: user.id,
        isException: parsed.data.exception === true,
        kind: parsed.data.kind === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN",
      },
    });
  });

  return Response.json({
    ok: true,
    data: {
      id: session.id,
      courseId: session.courseId,
      code: session.code,
      date: session.date,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      active: true,
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const courseRef = new URL(request.url).searchParams.get("courseId");
  if (!courseRef) {
    return Response.json({ ok: false, error: "courseId kerak" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseRef }, { slug: courseRef }] },
  });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await finalizeExpiredAttendanceSessions(course.id);

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: course.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const dates = [...new Set(sessions.map((session) => session.date.getTime()))].map(
    (time) => new Date(time),
  );
  const marks = dates.length
    ? await prisma.attendance.findMany({
        where: { courseId: course.id, date: { in: dates } },
        include: { student: { select: { id: true, name: true } } },
        orderBy: { student: { name: "asc" } },
      })
    : [];

  const byDate = new Map<number, typeof marks>();
  for (const mark of marks) {
    const key = mark.date.getTime();
    const list = byDate.get(key) ?? [];
    list.push(mark);
    byDate.set(key, list);
  }

  const now = Date.now();
  const data = sessions.map((session) => ({
    id: session.id,
    code: session.code,
    date: session.date,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    finalizedAt: session.finalizedAt,
    isException: session.isException,
    kind: session.kind,
    active: session.expiresAt.getTime() > now,
    marked: (byDate.get(session.date.getTime()) ?? []).map((mark) => ({
      studentId: mark.studentId,
      name: mark.student.name,
      status: mark.status,
    })),
  }));

  return Response.json({ ok: true, data: { sessions: data } });
}
