import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const awardSchema = z.object({
  studentId: z.string().min(1, "O'quvchi tanlanmagan"),
  credits: z.coerce
    .number()
    .finite("Kredit son bo'lishi kerak")
    .positive("Kredit 0 dan katta bo'lishi kerak"),
  reason: z
    .string()
    .trim()
    .min(3, "Sabab kamida 3 ta belgidan iborat bo'lishi kerak")
    .max(300, "Sabab 300 ta belgidan oshmasligi kerak"),
});

/**
 * VIP kredit — faqat rektor va prorektor. Qiymat fanga bog'lanmaydi:
 * `getStudentGpa` yakuniy GPA ga bevosita qo'shadi.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "REKTOR" && user.role !== "PRO_RECTOR") {
    return Response.json(
      { ok: false, error: "Kredit berish faqat rektor va prorektorga ruxsat etilgan" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = awardSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const { studentId, reason } = parsed.data;
  const credits = Math.round(parsed.data.credits * 100) / 100;
  if (credits <= 0) {
    return Response.json(
      { ok: false, error: "Kredit 0 dan katta bo'lishi kerak" },
      { status: 400 },
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
      { ok: false, error: "Kredit faqat o'quvchiga beriladi" },
      { status: 400 },
    );
  }
  if (!student.isActive) {
    return Response.json({ ok: false, error: "O'quvchi bloklangan" }, { status: 400 });
  }

  try {
    const record = await prisma.creditAward.create({
      data: { studentId, awardedById: user.id, credits, reason },
      include: { awardedBy: { select: { name: true } } },
    });

    await prisma.notification
      .create({
        data: {
          userId: studentId,
          title: "Kredit qo'shildi",
          body: `${user.name} sizga +${credits} kredit qo'shdi (GPAga qo'shildi). Sabab: ${reason}`,
          link: "/gpa",
        },
      })
      .catch((notificationError) => {
        console.error("credit notification failed", notificationError);
      });

    return Response.json(
      {
        ok: true,
        data: {
          id: record.id,
          studentId: record.studentId,
          studentName: student.name,
          credits: record.credits,
          reason: record.reason,
          awardedByName: record.awardedBy.name,
          createdAt: record.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("credit-awards create failed", error);
    return Response.json({ ok: false, error: "Kreditni saqlab bo'lmadi" }, { status: 500 });
  }
}
