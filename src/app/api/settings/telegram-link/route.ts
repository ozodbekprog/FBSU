import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

export const runtime = "nodejs";

/** Telegram bog'lanishini uzish. */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: null },
    });
    await prisma.telegramLinkCode.deleteMany({ where: { userId: user.id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Uzib bo'lmadi" }, { status: 500 });
  }
}
