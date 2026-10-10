import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const actionSchema = z.object({
  action: z.enum(["verify", "unverify"]).default("verify"),
});

/**
 * Vedomost (imtihon varaqalari) tasdig'i:
 * - KAFEDRA_MUDIRI faqat o'z kafedrasidagi kurs sessiyasini tasdiqlaydi
 * - ADMIN istalgan sessiyani tasdiqlaydi yoki tasdiqni bekor qiladi
 * Tasdiqlangandan keyin varaqalarni tahrirlash bloklanadi (sheets/[id] PATCH).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "KAFEDRA_MUDIRI") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const session = await prisma.examSession.findUnique({
    where: { id },
    select: {
      id: true,
      sheetVerifiedAt: true,
      course: { select: { teacher: { select: { departmentId: true } } } },
    },
  });
  if (!session) {
    return Response.json({ ok: false, error: "Sessiya topilmadi" }, { status: 404 });
  }

  const isKafedraHead =
    user.role === "KAFEDRA_MUDIRI" &&
    user.departmentId !== null &&
    session.course.teacher.departmentId === user.departmentId;
  if (user.role !== "ADMIN" && !isKafedraHead) {
    return Response.json({ ok: false, error: "Faqat o'z kafedrangiz sessiyasini tasdiqlaysiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  if (parsed.data.action === "unverify") {
    if (user.role !== "ADMIN") {
      return Response.json({ ok: false, error: "Tasdiqni faqat admin bekor qiladi" }, { status: 403 });
    }
    const updated = await prisma.examSession.update({
      where: { id },
      data: { sheetVerifiedAt: null, sheetVerifiedById: null },
      select: { id: true, sheetVerifiedAt: true, sheetVerifiedById: true },
    });
    return Response.json({ ok: true, data: updated });
  }

  if (session.sheetVerifiedAt) {
    return Response.json({ ok: false, error: "Vedomost allaqachon tasdiqlangan" }, { status: 409 });
  }

  const updated = await prisma.examSession.update({
    where: { id },
    data: { sheetVerifiedAt: new Date(), sheetVerifiedById: user.id },
    select: { id: true, sheetVerifiedAt: true, sheetVerifiedById: true },
  });
  return Response.json({ ok: true, data: updated });
}
