import "server-only";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestContext } from "@/lib/device";

export const DEVICE_APPROVAL_TTL_MS = 5 * 60 * 1000;
export const DEVICE_APPROVAL_MAX_ATTEMPTS = 5;

export class DeviceApprovalDeliveryError extends Error {
  constructor(message = "Telegramga kod yuborilmadi") {
    super(message);
    this.name = "DeviceApprovalDeliveryError";
  }
}

export type ApprovalDevice = {
  id: string;
  name: string;
  platform: string | null;
  browser: string | null;
  lastSeenAt: string;
  ip: string | null;
  location: string;
};

function approvalSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function hashApprovalCode(code: string, userId: string, challengeId: string): string {
  return createHmac("sha256", approvalSecret())
    .update(`${code}:${userId}:${challengeId}`)
    .digest("hex");
}

export function codeMatches(
  code: string,
  userId: string,
  challengeId: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashApprovalCode(code, userId, challengeId), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function locationLabel(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(", ") || "Noma'lum";
}

async function sendTelegramCode(chatId: string, code: string, text: {
  deviceName: string;
  location: string;
  ip: string;
}): Promise<boolean> {
  const token = (process.env.TELEGRAM_MINIAPP_BOT_TOKEN ?? "").trim();
  if (!token) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        disable_web_page_preview: true,
        text: [
          "FBSU xavfsizlik",
          "",
          "Yangi qurilmadan kirish so'rovi:",
          `Qurilma: ${text.deviceName}`,
          `Joylashuv: ${text.location}`,
          `IP: ${text.ip}`,
          "",
          `Tasdiqlash kodi: ${code}`,
          "Kod 5 daqiqa amal qiladi.",
          "",
          "Agar bu siz bo'lmasangiz, kodni hech kimga bermang.",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return json?.ok === true;
  } catch {
    return false;
  }
}

/**
 * Uchinchi qurilma uchun Telegram tasdiqlash sessiyasini yaratadi.
 * Kod faqat foydalanuvchi Telegramiga yuboriladi, javobda qaytmaydi.
 */
export async function createDeviceApproval(user: Pick<User, "id" | "telegramId">) {
  if (!user.telegramId) throw new DeviceApprovalDeliveryError("Telegram ulanmagan");

  const context = await getRequestContext();
  const challengeId = randomUUID();
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + DEVICE_APPROVAL_TTL_MS);
  const location = locationLabel(context.location.city, context.location.country);

  await prisma.deviceApprovalChallenge.create({
    data: {
      id: challengeId,
      userId: user.id,
      codeHash: hashApprovalCode(code, user.id, challengeId),
      ip: context.ip,
      userAgent: context.userAgent,
      deviceName: context.ua.name,
      platform: context.ua.platform,
      browser: context.ua.browser,
      city: context.location.city,
      country: context.location.country,
      location,
      method: "PASSWORD",
      expiresAt,
    },
  });

  const sent = await sendTelegramCode(user.telegramId, code, {
    deviceName: context.ua.name,
    location,
    ip: context.ip,
  });
  if (!sent) {
    await prisma.deviceApprovalChallenge.delete({ where: { id: challengeId } }).catch(() => undefined);
    throw new DeviceApprovalDeliveryError();
  }

  return {
    challengeId,
    expiresAt,
    deviceName: context.ua.name,
    location,
  };
}

/**
 * OWNER uchun: 2FA kodi allaqachon Telegram orqali tasdiqlangan, shuning uchun
 * qo'shimcha kod yubormasdan qurilma tanlash sessiyasi yaratiladi.
 */
export async function createVerifiedDeviceApproval(userId: string) {
  const context = await getRequestContext();
  const challengeId = randomUUID();
  const expiresAt = new Date(Date.now() + DEVICE_APPROVAL_TTL_MS);
  const location = locationLabel(context.location.city, context.location.country);

  await prisma.deviceApprovalChallenge.create({
    data: {
      id: challengeId,
      userId,
      codeHash: "",
      ip: context.ip,
      userAgent: context.userAgent,
      deviceName: context.ua.name,
      platform: context.ua.platform,
      browser: context.ua.browser,
      city: context.location.city,
      country: context.location.country,
      location,
      method: "OWNER",
      verifiedAt: new Date(),
      expiresAt,
    },
  });

  return {
    challengeId,
    expiresAt,
    deviceName: context.ua.name,
    location,
    devices: await listApprovalDevices(userId),
  };
}

export async function listApprovalDevices(userId: string): Promise<ApprovalDevice[]> {  const devices = await prisma.trustedDevice.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      platform: true,
      browser: true,
      lastSeenAt: true,
      lastIp: true,
      ip: true,
      city: true,
      country: true,
    },
  });
  return devices.map((device) => ({
    id: device.id,
    name: device.name,
    platform: device.platform,
    browser: device.browser,
    lastSeenAt: device.lastSeenAt.toISOString(),
    ip: device.lastIp ?? device.ip,
    location: locationLabel(device.city, device.country),
  }));
}
