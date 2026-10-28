import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramInitUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

const MAX_AGE_SECONDS = 24 * 60 * 60;

function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyInitData(initData: string, botToken: string): TelegramInitUser | null {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  const pairs: string[] = [];
  for (const [key, value] of params) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!safeEqualHex(computed, hash)) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  if (Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) return null;

  const raw = params.get("user");
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const user = parsed as { id?: unknown; username?: unknown; first_name?: unknown; last_name?: unknown };
  if (typeof user.id !== "number" || !Number.isFinite(user.id)) return null;

  return {
    id: String(user.id),
    username: typeof user.username === "string" ? user.username : null,
    firstName: typeof user.first_name === "string" ? user.first_name : null,
    lastName: typeof user.last_name === "string" ? user.last_name : null,
  };
}
