import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BONUS_MAX_TENTHS, BONUS_MIN_TENTHS } from "@/app/api/gpa/data";

const MIN_POINTS = (BONUS_MIN_TENTHS / 10).toFixed(1);
const MAX_POINTS = (BONUS_MAX_TENTHS / 10).toFixed(1);

const awardSchema = z.object({
  studentId: z.string().min(1, "O'quvchi tanlanmagan"),
  courseId: z.string().min(1, "Fan tanlanmagan"),
  // 0.6..4.0 uchun butun songa ×10 (6..40)
  tenths: z.coerce
    .number()
    .int("Ball 0.1 qadam bilan beriladi")
    .min(BONUS_MIN_TENTHS, `Ball kamida ${MIN_POINTS} bo'lishi kerak`)
    .max(BONUS_MAX_TENTHS, `Ball ko'pi bilan ${MAX_POINTS} bo'lishi kerak`),
  reason: z
    .string()
    .trim()
    .min(3, "Sabab kamida 3 ta belgidan iborat bo'lishi kerak")
    .max(300, "Sabab 300 ta belgidan oshmasligi kerak"),
});

/**
 * O'qituvchi o'z fani doirasida talabaga bonus GPA balli beradi.
 * Faqat TEACHER roli. Boshqa rollar (ADMIN/STUDENT) — 403.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Faqat o'qituvchi. ADMIN faqat ko'rishga huquqli (GET), bermaydi.
  if (user.role !== "TEACHER") {
    return Response.json(
      { ok: false, error: "Faqat o'qituvchi bonus ball bera oladi" },
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

  // O'z fani tekshiruvi: o'qituvchi faqat o'z kursidan berishi mumkin.
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, teacherId: true },
  });
  if (!course) {
    return Response.json({ ok: false, error: "Fan topilmadi" }, { status: 404 });
  }
  if (course.teacherId !== user.id) {
    return Response.json(
      { ok: false, error: "Faqat o'z faningizdan bonus ball bera olasiz" },
      { status: 403 },
    );
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

  // O'quvchi shu kursga yozilgan bo'lishi kerak.
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: studentId } },
    select: { id: true },
  });
  if (!enrollment) {
    return Response.json(
      { ok: false, error: "O'quvchi bu fanga yozilgan emas" },
      { status: 400 },
    );
  }

  const points = tenths / 10;

  try {
    const record = await prisma.bonusPoint.create({
      data: { courseId, studentId, awardedById: user.id, tenths, reason },
      include: {
        awardedBy: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    return Response.json(
      {
        ok: true,
        data: {
          id: record.id,
          studentId: record.studentId,
          studentName: student.name,
          courseId: record.courseId,
          courseTitle: record.course.title,
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