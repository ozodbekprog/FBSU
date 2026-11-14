import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 90_000;

function secret(): string | null {
  return process.env.TRAFFIC_INGEST_SECRET || process.env.AUTH_SECRET || null;
}

export function signTrafficHit(ts: string, visitorId: string, path: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(`${ts}\n${visitorId}\n${path}`).digest("hex");
}

export function verifyTrafficHit(
  ts: string,
  visitorId: string,
  path: string,
  signature: string,
): boolean {
  const numericTs = Number(ts);
  if (!Number.isFinite(numericTs)) return false;
  if (Math.abs(Date.now() - numericTs) > MAX_AGE_MS) return false;
  const expected = signTrafficHit(ts, visitorId, path);
  if (!expected || expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
