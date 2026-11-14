import "server-only";
import { splitText } from "./rich";

export const MESSAGE_EFFECTS = {
  confetti: "5046509860389126442",
  fire: "5104841245755180586",
};

export function appUrl(): string {
  return (process.env.FBSU_APP_URL ?? "https://fbsu.vercel.app").trim().replace(/\/+$/, "");
}

function botToken(): string {
  return (process.env.TELEGRAM_MINIAPP_BOT_TOKEN ?? "").trim();
}

export function telegramConfigured(): boolean {
  return Boolean(botToken());
}

export async function callBotApi(
  method: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_MINIAPP_BOT_TOKEN yo'q");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const json = (await response.json().catch(() => null)) as
    | { ok?: boolean; result?: unknown; description?: string }
    | null;
  if (!json?.ok) throw new Error(`${method}: ${json?.description ?? response.status}`);
  return json.result;
}

export async function sendBotMessage(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await callBotApi("sendMessage", {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(extra ?? {}),
    });
  } catch {
    // Telegram yetkazib bera olmasa ham webhook muvaffaqiyatli yakunlanadi.
  }
}

export async function sendRichBotMessage(
  chatId: number | string,
  text: string,
  extra: { message_effect_id?: string; reply_markup?: unknown } = {},
): Promise<void> {
  const chunks = splitText(text);
  for (let index = 0; index < chunks.length; index += 1) {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: chunks[index],
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (index === 0 && extra.message_effect_id) {
      payload.message_effect_id = extra.message_effect_id;
    }
    if (index === chunks.length - 1 && extra.reply_markup) {
      payload.reply_markup = extra.reply_markup;
    }
    try {
      await callBotApi("sendMessage", payload);
    } catch (error) {
      if (!payload.message_effect_id) throw error;
      delete payload.message_effect_id;
      await callBotApi("sendMessage", payload);
    }
  }
}

export async function sendTyping(chatId: number | string): Promise<void> {
  try {
    await callBotApi("sendChatAction", { chat_id: chatId, action: "typing" });
  } catch {
    // typing ixtiyoriy
  }
}

export function appKeyboard(path = "", label = "📱 FBSU'ni ochish") {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: label, web_app: { url: `${appUrl()}${path}` } }]],
    },
  };
}

export function reminderKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📱 FBSU'ni ochish", web_app: { url: appUrl() } }],
        [{ text: "📅 Haftalik jadval", web_app: { url: `${appUrl()}/schedule` } }],
      ],
    },
  };
}
