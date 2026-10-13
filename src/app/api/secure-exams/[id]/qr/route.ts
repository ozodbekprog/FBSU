import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSecureExam } from "@/server/secure-exam";
import { publicError } from "@/components/quiz/server";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const exam = await prisma.secureExam.findUnique({
      where: { id },
      include: { course: { select: { teacherId: true } } },
    });
    if (!exam) return Response.json({ ok: false, error: "Imtihon topilmadi" }, { status: 404 });
    if (
      !canManageSecureExam(
        { createdById: exam.createdById, courseTeacherId: exam.course.teacherId },
        user,
      )
    ) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const origin = new URL(request.url).origin;
    const link = `${origin}/e/${exam.code}`;
    const png = await QRCode.toBuffer(link, {
      type: "png",
      width: 320,
      margin: 1,
      color: { dark: "#131f3cff", light: "#ffffffff" },
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
