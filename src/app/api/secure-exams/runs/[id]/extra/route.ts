import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";
import { extraTimeSchema } from "@/modules/secure-exam/schemas";
import { findRunForStaff } from "@/server/secure-exam";
import { recordEvent } from "@/modules/events/record";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = extraTimeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  try {
    const run = await findRunForStaff(id, user);
    if (!run) return Response.json({ ok: false, error: "Urinish topilmadi" }, { status: 404 });
    if (run.status !== "ACTIVE") {
      return Response.json({ ok: false, error: "Urinish faol emas" }, { status: 409 });
    }

    const updated = await prisma.secureExamRun.update({
      where: { id },
      data: { extraMin: { increment: parsed.data.minutes } },
    });
    await recordEvent(user.id, "secure-exam.extra-time", {
      entity: "SecureExamRun",
      entityId: id,
      meta: { examId: run.examId, studentId: run.studentId, minutes: parsed.data.minutes },
    });

    return Response.json({ ok: true, data: { extraMin: updated.extraMin } });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
