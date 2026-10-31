import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  BONUS_MAX_TENTHS,
  BONUS_MIN_TENTHS,
  BONUS_RECTOR_MIN_TENTHS,
  BONUS_TENTHS_LIMIT,
} from "@/app/api/gpa/data";

const MIN_POINTS = String(BONUS_MIN_TENTHS / 10);
const MAX_POINTS = String(BONUS_MAX_TENTHS / 10);

const awardSchema = z.object({
  studentId: z.string().min(1, "O'quvchi tanlanmagan"),
  // O'qituvchi uchun majburiy; rektor bonusi fanga bog'lanmaydi.
  courseId: z.string().min(1, "Fan tanlanmagan").optional(),
  // Faqat butun ball: 1 ball = 10 o'nlik birlik.
  tenths: z.coerce
    .number()
    .int("Ball butun son bo'lishi kerak")
    .refine((value) => value % 10 === 0, "Ball butun son bo'lishi kerak"),
  reason: z
    .string()
    .trim()
    .min(3, "Sabab kamida 3 ta belgidan iborat bo'lishi kerak")
    .max(300, "Sabab 300 ta belgidan oshmasligi kerak"),
});

/**
 * O'qituvchi o'z fani doirasida, rektor esa istalgan talabaga chegarasiz
 * fanga bog'lanmagan bonus ball beradi. Boshqa rollar — 403.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const isTeacher = user.role === "TEACHER";
  const isRector = user.role === "REKTOR";

  // ADMIN faqat ko'rishga huquqli, bonus bermaydi.
  if (!isTeacher && !isRector) {
    return Response.json(
      { ok: false, error: "Faqat o'qituvchi yoki rektor bonus ball bera oladi" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = awardSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const { studentId, courseId, tenths, reason } = parsed.data;

  if (tenths > BONUS_TENTHS_LIMIT) {
    return Response.json({ ok: false, error: "Miqdor juda katta" }, { status: 400 });
  }

  if (isRector) {
    if (tenths < BONUS_RECTOR_MIN_TENTHS) {
      return Response.json(
        { ok: false, error: "Rektor kamida 1 ball bera oladi" },
        { status: 400 },
      );
    }
  } else if (tenths < BONUS_MIN_TENTHS || tenths > BONUS_MAX_TENTHS) {
    return Response.json(
      { ok: false, error: `Ball kamida ${MIN_POINTS}, ko'pi bilan ${MAX_POINTS} butun ball bo'lishi kerak` },
      { status: 400 },
    );
  }

  let course: { id: string; title: string; teacherId: string } | null = null;
  if (isTeacher) {
    if (!courseId) {
      return Response.json({ ok: false, error: "Fan tanlanmagan" }, { status: 400 });
    }
    const record = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, teacherId: true },
    });
    if (!record) {
      return Response.json({ ok: false, error: "Fan topilmadi" }, { status: 404 });
    }
    // O'qituvchi faqat o'z fanidan.
    if (record.teacherId !== user.id) {
      return Response.json(
        { ok: false, error: "Faqat o'z faningizdan bonus ball bera olasiz" },
        { status: 403 },
      );
    }
    course = record;
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!student) {
    return Response.json({ ok: false, error: "O'quvchi topilmadi" }, { status: 404 });
  }
  if (student.role !== "STUDENT") {
    return Response.json(
      { ok: false, error: "Bonus ball faqat o'quvchiga beriladi" },
      { status: 400 },
    );
  }
  if (!student.isActive) {
    return Response.json(
      { ok: false, error: "O'quvchi bloklangan" },
      { status: 400 },
    );
  }

  // O'qituvchi kursiga yozilganini, rektor talabasining kamida bitta faol fani borligini tekshiramiz.
  if (course) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id, userId: studentId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!enrollment) {
      return Response.json(
        { ok: false, error: "O'quvchi bu fanga yozilgan emas" },
        { status: 400 },
      );
    }
  } else {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: studentId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!enrollment) {
      return Response.json(
        { ok: false, error: "O'quvchi hech qanday faol fanga yozilmagan" },
        { status: 400 },
      );
    }
  }

  const points = tenths / 10;
  const pointsText = Number.isInteger(points) ? String(points) : points.toFixed(1);

  try {
    const record = await prisma.bonusPoint.create({
      data: {
        courseId: course?.id ?? null,
        studentId,
        awardedById: user.id,
        tenths,
        reason,
      },
      include: {
        awardedBy: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    await prisma.notification
      .create({
        data: {
          userId: studentId,
          title: course ? "Bonus ball qo'shildi" : "Bonus hamyoningiz to'ldi",
          body: course
            ? `${user.name} sizga "${course.title}" fanidan +${pointsText} ball berdi. Sabab: ${reason}`
            : `${user.name} sizga +${pointsText} bonus ball berdi. Uni o'zingiz tanlagan fanning umumiy balliga ishlatishingiz mumkin. Sabab: ${reason}`,
          link: "/bonus-points",
        },
      })
      .catch((notificationError) => {
        console.error("bonus notification failed", notificationError);
      });

    return Response.json(
      {
        ok: true,
        data: {
          id: record.id,
          studentId: record.studentId,
          studentName: student.name,
          courseId: record.courseId,
          courseTitle: record.course?.title ?? null,
          points,
          reason: record.reason,
          awardedByName: record.awardedBy.name,
          createdAt: record.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    const isConflict =
      code === "P2002" ||
      (error instanceof Error && error.message.toLowerCase().includes("unique"));

    if (isConflict) {
      return Response.json(
        { ok: false, error: "Bu o'quvchiga ushbu fandan bonus allaqach berilgan" },
        { status: 409 },
      );
    }

    console.error("bonus-points create failed", error);
    return Response.json({ ok: false, error: "Ballni saqlab bo'lmadi" }, { status: 500 });
  }
}