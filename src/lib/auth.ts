import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@prisma/client";

const COOKIE_NAME = "ttpu_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  uid: string;
  role: Role;
  name: string;
  email: string;
  epoch: number;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(user: Pick<User, "id" | "role" | "name" | "email" | "sessionEpoch">) {
  const token = await new SignJWT({
    uid: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    epoch: user.sessionEpoch,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
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
    const { payload } = await jwtVerify(token, secretKey());
    return {
      uid: payload.uid as string,
      role: payload.role as Role,
      name: payload.name as string,
      email: payload.email as string,
      epoch: typeof payload.epoch === "number" ? payload.epoch : -1,
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
    },
  });
  if (!user || !user.isActive) return null;
  if (user.sessionEpoch !== session.epoch) return null;
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
  const grant = await prisma.salaryGrant.findUnique({
    where: { role },
    select: { canView: true, revokedAt: true },
  });
  return Boolean(grant && grant.canView && !grant.revokedAt);
}

/** Oylikni o'zgartirishi mumkin (yozuv kiritish, tasdiqlash) — faqat buxgalter. */
export function canManageSalary(role: Role) {
  return isBuxgalter(role);
}
