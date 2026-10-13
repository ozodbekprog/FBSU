import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";
import { finalizeRun, findRunForStaff } from "@/server/secure-exam";
import { logAudit } from "@/server/audit";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const run = await findRunForStaff(id, user);
    if (!run) return Response.json({ ok: false, error: "Urinish topilmadi" }, { status: 404 });

    if (run.status === "ACTIVE") {
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.secureExamEvent.create({
          data: {
            runId: id,
            type: "TERMINATED",
            severity: "INFO",
            meta: { reason: "staff" },
          },
        });
        await finalizeRun(tx, id, "TERMINATED", now);
      });
      await logAudit({
        actorId: user.id,
        action: "secure-exam.terminate",
        entity: "SecureExamRun",
        entityId: id,
        meta: { examId: run.examId, studentId: run.studentId },
      });
    }

    return Response.json({ ok: true, data: { status: "TERMINATED" } });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
