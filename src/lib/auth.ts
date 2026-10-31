import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { prepareSession } from "@/lib/device";
import type { LoginMethod, Role, User } from "@prisma/client";

const COOKIE_NAME = "ttpu_session";
const MAX_AGE = 60 * 60 * 24 * 7;
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = {
  uid: string;
  role: Role;
  name: string;
  email: string;
  epoch: number;
  /** LoginRecord.id — shu sessiyadagi audit o'zgarishlarini bog'lash uchun. */
  sid: string | null;
  /** TrustedDevice.id — qurilma bekor qilinsa sessiya ham yaroqsiz bo'ladi. */
  did: string | null;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type CreateSessionOptions = {
  remember?: boolean;
  method?: LoginMethod;
  /**
   * Joriy sessiyani yangilash (masalan, profil/parol o'zgarishi). Yangi
   * login tarixi yaratilmaydi va qurilma limiti qayta tekshirilmaydi.
   */
  renew?: boolean;
  /** Login tarixidagi izoh (masalan, Telegram tasdiqlash haqida). */
  note?: string;
};

export type CreateSessionResult = {
  sessionId: string | null;
  deviceId: string | null;
};

export async function createSession(
  user: Pick<User, "id" | "role" | "name" | "email" | "sessionEpoch"> & {
    telegramId?: string | null;
  },
  opts?: CreateSessionOptions,
): Promise<CreateSessionResult> {
  let sessionId: string | null = null;
  let deviceId: string | null = null;

  if (opts?.renew) {
    const current = await getSession();
    if (current && current.uid === user.id) {
      sessionId = current.sid;
      deviceId = current.did;
    }
  }

  if (!sessionId && !opts?.renew) {
    const prepared = await prepareSession(user.id, opts?.method ?? "PASSWORD", {
      enforceDeviceLimit: Boolean(user.telegramId),
    });
    sessionId = prepared.loginId;
    deviceId = prepared.device.id;
    await prisma.loginRecord.create({
      data: {
        id: sessionId,
        userId: user.id,
        deviceId: prepared.device.id,
        ip: prepared.ip,
        userAgent: prepared.userAgent,
        deviceName: prepared.device.name,
        platform: prepared.device.platform,
        browser: prepared.device.browser,
        city: prepared.location.city,
        country: prepared.location.country,
        location: prepared.location.label,
        method: opts?.method ?? "PASSWORD",
        status: "SUCCESS",
        note: opts?.note ?? null,
      },
    });
  }

  const remember = opts?.remember === true;
  const maxAge = remember ? REMEMBER_MAX_AGE : MAX_AGE;
  const token = await new SignJWT({
    uid: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    epoch: user.sessionEpoch,
    sid: sessionId,
    did: deviceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "7d")
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  return { sessionId, deviceId };
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return {
      uid: payload.uid as string,
      role: payload.role as Role,
      name: payload.name as string,
      email: payload.email as string,
      epoch: typeof payload.epoch === "number" ? payload.epoch : -1,
      sid: typeof payload.sid === "string" ? payload.sid : null,
      did: typeof payload.did === "string" ? payload.did : null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      coverUrl: true,
      bio: true,
      preferences: true,
      isActive: true,
      sessionEpoch: true,
      createdAt: true,
      groupId: true,
      subGroupId: true,
      facultyId: true,
      departmentId: true,
      group: true,
      subGroup: true,
      faculty: true,
      department: true,
      telegramId: true,
      trustedDevices: { where: { revokedAt: null }, select: { id: true } },
    },
  });
  if (!user || !user.isActive) return null;
  if (user.sessionEpoch !== session.epoch) return null;
  // Qurilma bekor qilingan bo'lsa, undan ochilgan sessiya ham darhol
  // yaroqsiz bo'ladi. Eski (qurilmasiz) sessiyalar ishlashda davom etadi.
  if (session.did && !user.trustedDevices.some((device) => device.id === session.did)) {
    return null;
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export function isStaff(role: Role) {
  return role === "ADMIN" || role === "TEACHER";
}

export function isRegistrar(role: Role) {
  return role === "REGISTRAR";
}

/// Oylik bo'yicha birinchi bo'lib mas'ul rol — buxgalter.
/// U yozuv yaratadi, tasdiqlaydi va boshqa rollarga ko'rish ruxsati beradi.
export function isBuxgalter(role: Role) {
  return role === "BUXGALTER";
}

/**
 * Oylik moduli ko'rinishi mumkin bo'lgan rollar.
 *
 * BUXGALTER hamma narsani ko'radi va boshqaradi. ADMIN o'z moliyaviy
 * ma'lumotini ko'radi. Qolgan rollar faqat BUXGALTER ularga `SalaryGrant`
 * orqali ruxsat bergan bo'lsa ko'radi — ya'ni bu funksiya **faqat**
 * `SalaryGrant`ni tekshiradi, o'z-o'zidan hech kimga ruxsat bermaydi.
 */
export async function canViewSalary(role: Role): Promise<boolean> {
  if (isBuxgalter(role) || role === "ADMIN") return true;
  // `findUnique` `role` unique bo'lishiga bog'liq — schema'dagi o'zgarish
  // dasturchi keshi eskirgan mijozida "needs at least one of id" xatosini
  // beradi. `findFirst` har doim birinchi mos yozuvni qaytaradi, xuddi
  // shunday natija beradi va unique constraint'ga bog'liq emas.
  const grant = await prisma.salaryGrant.findFirst({
    where: { role },
    select: { canView: true, revokedAt: true },
  });
  return Boolean(grant && grant.canView && !grant.revokedAt);
}

/** Oylikni o'zgartirishi mumkin (yozuv kiritish, tasdiqlash) — faqat buxgalter. */
export function canManageSalary(role: Role) {
  return isBuxgalter(role);
}
