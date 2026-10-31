import {
  handleTelegramUpdate,
  telegramConfigured,
  type TelegramUpdate,
} from "@/server/telegram/bot";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * @ttpu_uz_bot webhook'i. Telegram so'rovni `x-telegram-bot-api-secret-token`
 * sarlavhasi bilan imzolaydi; boshqa manbalar 401 oladi.
 */
export async function POST(request: Request) {
  const secret = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
  if (!secret || !telegramConfigured()) {
    return Response.json(
      { ok: false, error: "Telegram webhook sozlanmagan" },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (provided !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return Response.json({ ok: true });

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error("[telegram-webhook]", error);
  }
  // Telegram xatoni qayta yubormasligi uchun har doim 200.
  return Response.json({ ok: true });
}
