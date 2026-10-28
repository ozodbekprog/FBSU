import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser } from "@/lib/auth";
import { verifyInitData } from "@/server/telegram-init-data";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp as getClientIpFromHeaders } from "@/lib/client-ip";

const schema = z.object({
  initData: z.string().min(16).max(8192),
});

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumot yuborilmadi" }, { status: 400 });
  }

  const token = (process.env.TELEGRAM_MINIAPP_BOT_TOKEN ?? "").trim();
  if (!token) {
    return Response.json({ ok: false, error: "Telegram mini ilova sozlanmagan" }, { status: 503 });
  }

  const rateLimit = await checkRateLimit(`telegram-auth:${getClientIpFromHeaders(request.headers) ?? "local"}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 60,
    keyPrefix: "auth",
  });
  if (!rateLimit.allowed) {
    return Response.json({ ok: false, error: "Juda ko'p urinish" }, { status: 429 });
  }

  const telegramUser = verifyInitData(parsed.data.initData, token);
  if (!telegramUser) {
    return Response.json({ ok: false, error: "Telegram ma'lumotlari tasdiqlanmadi" }, { status: 401 });
  }

  const linked = await prisma.user.findUnique({ where: { telegramId: telegramUser.id } });
  if (linked) {
    if (!linked.isActive) {
      return Response.json({ ok: false, error: "Akkaunt faol emas" }, { status: 403 });
    }
    await createSession(linked, { remember: true });
    await createAuditLog({
      action: "LOGIN_SUCCESS",
      meta: { email: linked.email, channel: "telegram_miniapp" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: true, mode: "login", name: linked.name });
  }

  const current = await getCurrentUser();
  if (!current) {
    return Response.json({ ok: true, mode: "guest" });
  }
  const profile = await prisma.user.findUnique({
    where: { id: current.id },
    select: { telegramId: true },
  });
  if (!profile) {
    return Response.json({ ok: true, mode: "guest" });
  }
  if (profile.telegramId && profile.telegramId !== telegramUser.id) {
    return Response.json(
      { ok: false, error: "Bu akkaunt boshqa Telegram hisobi bilan bog'langan" },
      { status: 409 },
    );
  }
  if (!profile.telegramId) {
    try {
      await prisma.user.update({ where: { id: current.id }, data: { telegramId: telegramUser.id } });
      await createAuditLog({
        action: "USER_UPDATE",
        entity: "User",
        meta: { email: current.email, channel: "telegram_miniapp", linked: true },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
    } catch {
      return Response.json({ ok: false, error: "Telegram hisobini bog'lab bo'lmadi" }, { status: 409 });
    }
  }
  return Response.json({ ok: true, mode: "link", name: current.name });
}
