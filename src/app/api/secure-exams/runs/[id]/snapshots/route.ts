import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicError } from "@/components/quiz/server";
import { findRunForStaff } from "@/server/secure-exam";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const run = await findRunForStaff(id, user);
    if (!run) return Response.json({ ok: false, error: "Urinish topilmadi" }, { status: 404 });

    const snapshots = await prisma.secureExamSnapshot.findMany({
      where: { runId: id },
      orderBy: { at: "desc" },
      take: 8,
      select: { at: true, mime: true, data: true },
    });

    return Response.json({
      ok: true,
      data: {
        snapshots: snapshots.map((snapshot) => ({
          at: snapshot.at.toISOString(),
          image: `data:${snapshot.mime};base64,${snapshot.data}`,
        })),
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
