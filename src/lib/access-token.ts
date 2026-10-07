import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "TTPU1";

function tokenSecret() {
  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET or AUTH_SECRET is not set");
  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

export function createAccessToken(userId: string, ttlDays = 30): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ u: userId, e: expiresAt }), "utf8").toString("base64url");
  return `${TOKEN_PREFIX}.${payload}.${signPayload(payload)}`;
}

export function verifyAccessToken(token: string): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [prefix, payload, signature] = parts;
  if (prefix !== TOKEN_PREFIX || !payload || !signature) return null;

  const expected = Buffer.from(signPayload(payload), "base64url");
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.u !== "string" || !record.u) return null;
  if (typeof record.e !== "number" || !Number.isFinite(record.e)) return null;
  if (record.e * 1000 <= Date.now()) return null;

  return { userId: record.u };
}
