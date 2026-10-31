import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { LoginMethod, TrustedDevice } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { resolveLocation, type LocationInfo } from "@/server/geo";

/** Bir hisobga bir vaqtda ulanadigan qurilmalar soni. */
export const MAX_DEVICES = 2;
export const DEVICE_COOKIE = "ttpu_device";
const DEVICE_MAX_AGE = 60 * 60 * 24 * 365;
const DEVICE_TOKEN_AUDIENCE = "fbdev";

export class DeviceLimitError extends Error {
  constructor() {
    super("Qurilma limiti tugagan");
    this.name = "DeviceLimitError";
  }
}

export type UserAgentInfo = {
  name: string;
  platform: string | null;
  browser: string | null;
};

export type PreparedSession = {
  loginId: string;
  device: TrustedDevice;
  ip: string;
  userAgent: string;
  ua: UserAgentInfo;
  location: LocationInfo;
};

export type RequestContext = {
  ip: string;
  userAgent: string;
  ua: UserAgentInfo;
  location: LocationInfo;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function hashDeviceId(userId: string, deviceId: string): string {
  return createHash("sha256").update(`fbdev:${userId}:${deviceId}`).digest("hex");
}

async function issueDeviceToken(deviceId: string): Promise<string> {
  return new SignJWT({ dev: deviceId, aud: DEVICE_TOKEN_AUDIENCE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(secretKey());
}

async function readDeviceToken(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secretKey(), {
      algorithms: ["HS256"],
      audience: DEVICE_TOKEN_AUDIENCE,
    });
    return typeof payload.dev === "string" && payload.dev.length > 0 ? payload.dev : null;
  } catch {
    return null;
  }
}

/** Brauzer "qurilma nomi"ni bera olmaydi — user-agent'dan o'qiladigan nom. */
export function parseUserAgent(userAgent: string | null | undefined): UserAgentInfo {
  const ua = (userAgent ?? "").trim();
  if (!ua || ua === "unknown") {
    return { name: "Noma'lum qurilma", platform: null, browser: null };
  }

  let platform: string | null = null;
  if (/iPhone/i.test(ua)) platform = "iPhone";
  else if (/iPad/i.test(ua)) platform = "iPad";
  else if (/Android/i.test(ua)) {
    const model = /Android[^;)]*;\s*([^;)]+?)(?:\s+Build|\)|;)/i.exec(ua)?.[1]?.trim();
    platform = model && model.length <= 40 ? model : "Android";
  } else if (/Windows NT/i.test(ua)) platform = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) platform = "macOS";
  else if (/CrOS/i.test(ua)) platform = "ChromeOS";
  else if (/Linux/i.test(ua)) platform = "Linux";

  let browser: string | null = null;
  if (/Telegram/i.test(ua)) browser = "Telegram";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox\/|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Chrome\/|CriOS/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  const deviceLabel =
    platform && /^(iPhone|iPad|Android|Windows|macOS|Linux|ChromeOS)$/i.test(platform) && platform !== "Windows"
      ? platform
      : platform === "Windows"
        ? "Windows PC"
        : platform;

  const parts = [deviceLabel, browser].filter((part): part is string => Boolean(part));
  const name = parts.join(" · ");
  return {
    name: (name || "Noma'lum qurilma").slice(0, 80),
    platform,
    browser,
  };
}

export async function getRequestContext(): Promise<RequestContext> {
  const headerStore = await headers();
  const ip = getClientIp(headerStore) ?? "unknown";
  const userAgent = headerStore.get("user-agent")?.slice(0, 512) ?? "unknown";
  const ua = parseUserAgent(userAgent);
  const location = await resolveLocation(headerStore, ip);
  return { ip, userAgent, ua, location };
}

export async function countActiveDevices(userId: string): Promise<number> {
  return prisma.trustedDevice.count({ where: { userId, revokedAt: null } });
}

export async function recordBlockedLogin(
  userId: string,
  method: LoginMethod,
  info: RequestContext,
) {
  await prisma.loginRecord.create({
    data: {
      userId,
      ip: info.ip,
      userAgent: info.userAgent,
      deviceName: info.ua.name,
      platform: info.ua.platform,
      browser: info.ua.browser,
      city: info.location.city,
      country: info.location.country,
      location: info.location.label,
      method,
      status: "BLOCKED",
    },
  });
}

/**
 * Kirish uchun qurilmani tayyorlaydi:
 * - cookie'dagi imzolangan identifikator bo'yicha mavjud qurilmani topadi;
 * - yangi qurilma bo'lsa va 2 ta faol qurilma bo'lsa — kirishni bloklaydi
 *   (tarixga BLOCKED yozuvi qoldirib, DeviceLimitError tashlaydi);
 * - bo'sh joy bo'lsa qurilmani ro'yxatga oladi va cookie yozadi.
 */
export async function prepareSession(
  userId: string,
  method: LoginMethod,
  opts?: { enforceDeviceLimit?: boolean },
): Promise<PreparedSession> {
  const info = await getRequestContext();
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  const deviceId = await readDeviceToken(token);

  if (deviceId) {
    const device = await prisma.trustedDevice.findFirst({
      where: { userId, deviceHash: hashDeviceId(userId, deviceId), revokedAt: null },
    });
    if (device) {
      const updated = await prisma.trustedDevice.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          lastIp: info.ip,
          city: info.location.city,
          country: info.location.country,
          userAgent: info.userAgent,
        },
      });
      return { loginId: randomUUID(), device: updated, ...info };
    }
  }

  const enforceLimit = opts?.enforceDeviceLimit === true;
  if (enforceLimit) {
    const active = await prisma.trustedDevice.count({ where: { userId, revokedAt: null } });
    if (active >= MAX_DEVICES) {
      await recordBlockedLogin(userId, method, info);
      throw new DeviceLimitError();
    }
  }

  const newDeviceId = randomUUID();
  const device = await prisma.trustedDevice.create({
    data: {
      userId,
      deviceHash: hashDeviceId(userId, newDeviceId),
      name: info.ua.name,
      platform: info.ua.platform,
      browser: info.ua.browser,
      userAgent: info.userAgent,
      ip: info.ip,
      city: info.location.city,
      country: info.location.country,
    },
  });

  // Parallel kirishlar 2 tadan oshib ketmasligi uchun qayta sanaymiz:
  // ortiqcha bo'lsa, aynan shu qurilma bekor qilinadi.
  if (enforceLimit) {
    const activeAfter = await prisma.trustedDevice.count({ where: { userId, revokedAt: null } });
    if (activeAfter > MAX_DEVICES) {
      await prisma.trustedDevice.update({
        where: { id: device.id },
        data: { revokedAt: new Date() },
      });
      cookieStore.delete(DEVICE_COOKIE);
      await recordBlockedLogin(userId, method, info);
      throw new DeviceLimitError();
    }
  }

  cookieStore.set(DEVICE_COOKIE, await issueDeviceToken(newDeviceId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_MAX_AGE,
  });

  return { loginId: randomUUID(), device, ...info };
}

/**
 * Eng eski faol qurilmalarni `keep` tagacha uzedi. Telegram mini ilovasi
 * orqali avtomatik kirishda limit to'lgan bo'lsa ishlatiladi — foydalanuvchi
 * tanlovisiz eski sessiyalar almashtiriladi.
 */
export async function revokeOldestDevices(
  userId: string,
  keep = MAX_DEVICES - 1,
): Promise<string[]> {
  const active = await prisma.trustedDevice.findMany({
    where: { userId, revokedAt: null },
    orderBy: [{ lastSeenAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
  const remove = active.slice(0, Math.max(0, active.length - keep));
  if (remove.length === 0) return [];
  await prisma.trustedDevice.updateMany({
    where: { id: { in: remove.map((device) => device.id) } },
    data: { revokedAt: new Date() },
  });
  return remove.map((device) => device.name);
}

export async function currentDeviceId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const deviceId = await readDeviceToken(cookieStore.get(DEVICE_COOKIE)?.value);
  if (!deviceId) return null;
  const device = await prisma.trustedDevice.findFirst({
    where: { userId, deviceHash: hashDeviceId(userId, deviceId), revokedAt: null },
    select: { id: true },
  });
  return device?.id ?? null;
}
