import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { lookupQrLocation, verifyQrToken } from "@/modules/attendance-security/qr-token";
import {
  clientIpFromHeaders,
  evaluateCheckInRisk,
} from "@/modules/attendance-security/verify";
import { checkFace } from "@/modules/attendance/face";

const CHECK_IN_WINDOW_MS = 10 * 60 * 1000;
const CHECK_IN_MAX_ATTEMPTS = 10;

const checkInSchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    code: z.string().trim().min(4).max(12).optional(),
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    accuracy: z.number().finite().optional(),
    faceDescriptor: z.array(z.number().finite()).max(256).optional(),
  })
  .refine((value) => Boolean(value.token || value.code), {
    message: "Token yoki kod kerak",
  });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Faqat talabalar belgilanishi mumkin" }, { status: 403 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const rateLimit = await checkRateLimit(`check-in:${ip ?? "local"}:${user.id}`, {
    windowMs: CHECK_IN_WINDOW_MS,
    maxAttempts: CHECK_IN_MAX_ATTEMPTS,
    keyPrefix: "attendance",
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const token = parsed.data.token;
  const code = parsed.data.code?.toUpperCase();
  const payload = token ? await verifyQrToken(token).catch(() => null) : null;
  if (token && !payload) {
    return Response.json(
      { ok: false, error: "QR kod eskirgan, yangisini skanerlang" },
      { status: 400 },
    );
  }

  const session = payload
    ? await prisma.attendanceSession.findUnique({
        where: { id: payload.sid },
        include: { course: { select: { id: true, title: true, slug: true } } },
      })
    : await prisma.attendanceSession.findUnique({
        where: { code: code ?? "" },
        include: { course: { select: { id: true, title: true, slug: true } } },
      });
  if (!session) {
    return Response.json(
      { ok: false, error: "Bunday kodli faol sessiya topilmadi" },
      { status: 404 },
    );
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    return Response.json({ ok: false, error: "Sessiya muddati tugagan" }, { status: 400 });
  }

  const enrolled = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: session.courseId, userId: user.id }, status: "ACTIVE" },
  });
  if (!enrolled) {
    return Response.json({ ok: false, error: "Siz bu kursga yozilmagansiz" }, { status: 403 });
  }

  const existing = await prisma.attendance.findUnique({
    where: {
      courseId_studentId_date: {
        courseId: session.courseId,
        studentId: user.id,
        date: session.date,
      },
    },
  });
  if (existing && existing.status !== "ABSENT") {
    const faceRetry = existing.status === "SUSPICIOUS" && parsed.data.faceDescriptor !== undefined;
    if (!faceRetry) {
      return Response.json(
        { ok: false, error: "Bugun bu kurs uchun davomat allaqachon belgilangan" },
        { status: 409 },
      );
    }
  }

  const tokenLocation = payload ? (payload.loc ?? lookupQrLocation(payload.jti)) : undefined;
  const studentLocation =
    typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number"
      ? {
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          accuracy: parsed.data.accuracy,
        }
      : undefined;
  const faceRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { faceDescriptor: true },
  });
  const faceCheck = checkFace(faceRow?.faceDescriptor ?? null, parsed.data.faceDescriptor ?? null);

  const risk = await evaluateCheckInRisk({
    studentId: user.id,
    sessionId: session.id,
    courseId: session.courseId,
    tokenLocation,
    studentLocation,
    ip,
    usedCode: !payload,
    faceCheck,
  });
  const status = risk.suspicious ? "SUSPICIOUS" : "PRESENT";
  const note = risk.suspicious
    ? `Shubhali: ${risk.reasons.join(", ")}`
    : faceCheck === "ok"
      ? "QR orqali · Face ID"
      : "QR orqali";

  const attendance = await prisma.attendance.upsert({
    where: {
      courseId_studentId_date: {
        courseId: session.courseId,
        studentId: user.id,
        date: session.date,
      },
    },
    update: { status, note },
    create: {
      courseId: session.courseId,
      studentId: user.id,
      date: session.date,
      status,
      note,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "attendance.check-in",
      entity: "Attendance",
      entityId: attendance.id,
      meta: {
        sessionId: session.id,
        courseId: session.courseId,
        ip,
        reasons: risk.reasons,
        distanceM: risk.distanceM ?? null,
        suspicious: risk.suspicious,
        faceCheck,
      },
    },
  });

  return Response.json({
    ok: true,
    data: {
      course: session.course,
      date: session.date.toISOString().slice(0, 10),
      status,
      suspicious: risk.suspicious,
      reasons: risk.reasons,
      faceCheck,
    },
  });
}
