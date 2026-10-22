import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";

const snapshotSchema = z.object({
  image: z.string().min(100).max(300_000, "Kadr hajmi juda katta"),
});

const IMAGE_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const MAX_SNAPSHOTS_PER_RUN = 12;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Kadr noto'g'ri" },
      { status: 400 },
    );
  }

  const match = IMAGE_PATTERN.exec(parsed.data.image);
  if (!match) {
    return Response.json({ ok: false, error: "Kadr formati noto'g'ri" }, { status: 400 });
  }

  try {
    const run = await prisma.secureExamRun.findUnique({
      where: { id },
      select: { id: true, studentId: true, status: true },
    });
    if (!run || run.studentId !== user.id) {
      return Response.json({ ok: false, error: "Urinish topilmadi" }, { status: 404 });
    }
    if (run.status !== "ACTIVE") {
      return Response.json({ ok: true, data: { skipped: true } });
    }

    const at = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.secureExamSnapshot.create({
        data: { runId: id, at, mime: match[1], data: match[2] },
      });
      const old = await tx.secureExamSnapshot.findMany({
        where: { runId: id },
        orderBy: { at: "desc" },
        skip: MAX_SNAPSHOTS_PER_RUN,
        select: { id: true },
      });
      if (old.length > 0) {
        await tx.secureExamSnapshot.deleteMany({
          where: { id: { in: old.map((snapshot) => snapshot.id) } },
        });
      }
    });

    return Response.json({ ok: true, data: { at: at.toISOString() } }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
