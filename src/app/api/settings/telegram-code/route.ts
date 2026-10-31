import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

export const runtime = "nodejs";

const CODE_TTL_MS = 10 * 60 * 1000;

/**
 * Bot orqali bog'lash uchun bir martalik 6 xonali kod. Kod bazada saqlanadi
 * (fayl tizimiga yozilmaydi), shuning uchun Vercel'da ham ishlaydi.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  if (user.telegramId) {
    return Response.json(
      { ok: false, error: "Telegram allaqachon bog'langan" },
      { status: 409 },
    );
  }

  try {
    await prisma.telegramLinkCode.deleteMany({ where: { userId: user.id } });
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = randomInt(0, 1000000).toString().padStart(6, "0");
      try {
        await prisma.telegramLinkCode.create({
          data: { code, userId: user.id, expiresAt },
        });
        return Response.json({ ok: true, data: { code, expiresAt: expiresAt.toISOString() } });
      } catch {
        // Kod band bo'lsa, yangisini urinamiz.
      }
    }
    return Response.json({ ok: false, error: "Kod generatsiya qilinmadi" }, { status: 500 });
  } catch {
    return Response.json({ ok: false, error: "Kodni saqlab bo'lmadi" }, { status: 500 });
  }
}
