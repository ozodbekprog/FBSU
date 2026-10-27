import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BONUS_TENTHS_LIMIT, getCourseBonusHeadroom } from "@/app/api/gpa/data";

const allocateSchema = z.object({
  bonusPointId: z.string().min(1, "Bonus tanlanmagan"),
  courseId: z.string().min(1, "Fan tanlanmagan"),
  tenths: z.coerce
    .number()
    .int("Ball butun son bo'lishi kerak")
    .min(10, "Kamida 1 ball ishlatiladi")
    .refine((value) => value % 10 === 0, "Ball butun son bo'lishi kerak")
    .max(BONUS_TENTHS_LIMIT, "Miqdor juda katta"),
});

/**
 * Talaba rektor bergan (fanga bog'lanmagan) bonusni o'zi tanlagan fanga
 * ishlatadi. Qoldiq va 100% chegarasi serverda qayta tekshiriladi.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "STUDENT") {
    return Response.json(
      { ok: false, error: "Bonusni faqat talaba fanga ishlatadi" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = allocateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const { bonusPointId, courseId, tenths } = parsed.data;

  const grant = await prisma.bonusPoint.findUnique({
    where: { id: bonusPointId },
    select: {
      id: true,
      studentId: true,
      courseId: true,
      tenths: true,
      awardedById: true,
      awardedBy: { select: { role: true } },
    },
  });
  if (!grant || grant.studentId !== user.id) {
    return Response.json({ ok: false, error: "Bonus topilmadi" }, { status: 404 });
  }
  if (grant.courseId !== null) {
    return Response.json(
      { ok: false, error: "Bu bonus allaqachon fanga biriktirilgan" },
      { status: 400 },
    );
  }
  if (grant.awardedBy.role !== "REKTOR") {
    return Response.json(
      { ok: false, error: "Bu bonusni fanga ishlatish mumkin emas" },
      { status: 400 },
    );
  }

  const [enrollment, used, headroom, course] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId: user.id } },
      select: { status: true },
    }),
    prisma.bonusAllocation.aggregate({
      where: { bonusPointId },
      _sum: { tenths: true },
    }),
    getCourseBonusHeadroom(user.id, courseId),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    }),
  ]);

  if (!course || enrollment?.status !== "ACTIVE") {
    return Response.json(
      { ok: false, error: "Fan topilmadi yoki siz bu fanga yozilmagansiz" },
      { status: 400 },
    );
  }

  const remaining = Math.max(0, grant.tenths - (used._sum.tenths ?? 0));
  // Eski kasr qoldiqlar ham butun ballga yaxlitlanadi.
  const wholeRemaining = Math.floor(remaining / 10) * 10;
  if (wholeRemaining <= 0) {
    return Response.json(
      { ok: false, error: "Bu bonus to'liq ishlatilgan" },
      { status: 400 },
    );
  }
  if (tenths > wholeRemaining) {
    return Response.json(
      {
        ok: false,
        error: `Bu bonusdan faqat ${wholeRemaining / 10} ball qoldi`,
      },
      { status: 400 },
    );
  }
  if (headroom.maxScore <= 0) {
    return Response.json(
      { ok: false, error: "Bu fan hali baholanmagan — ballar baholar chiqqach qo'shiladi" },
      { status: 400 },
    );
  }
  const wholeHeadroom = Math.floor(headroom.headroomTenths / 10) * 10;
  if (wholeHeadroom <= 0) {
    return Response.json(
      {
        ok: false,
        error:
          headroom.headroomTenths > 0
            ? "Bu fanga butun ball sig'maydi — faqat kasr joy qolgan"
            : "Bu fan 100% ga yetgan — ball ishlatish shart emas",
      },
      { status: 400 },
    );
  }
  if (tenths > wholeHeadroom) {
    return Response.json(
      {
        ok: false,
        error: `Bu fanga faqat ${wholeHeadroom / 10} ball sig'adi`,
      },
      { status: 400 },
    );
  }

  try {
    const allocation = await prisma.bonusAllocation.upsert({
      where: { bonusPointId_courseId: { bonusPointId, courseId } },
      create: { bonusPointId, courseId, tenths },
      update: { tenths: { increment: tenths } },
      select: { id: true, tenths: true },
    });

    await prisma.notification
      .create({
        data: {
          userId: grant.awardedById,
          title: "Bonus fanga ishlatildi",
          body: `${user.name} siz bergan +${tenths / 10} ballni "${course.title}" faniga ishlatdi.`,
          link: "/bonus-points",
        },
      })
      .catch((notificationError) => {
        console.error("bonus allocation notification failed", notificationError);
      });

    const nextScore = headroom.score + (headroom.appliedTenths + tenths) / 10;
    const percent = Math.min(100, Math.max(0, Math.round((nextScore / headroom.maxScore) * 100)));

    return Response.json(
      {
        ok: true,
        data: {
          allocationId: allocation.id,
          bonusPointId,
          courseId,
          courseTitle: course.title,
          allocatedPoints: tenths / 10,
          allocatedFromGrant: allocation.tenths / 10,
          remainingPoints: (remaining - tenths) / 10,
          percent,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("bonus allocation failed", error);
    return Response.json(
      { ok: false, error: "Ballni fanga ishlatib bo'lmadi" },
      { status: 500 },
    );
  }
}
