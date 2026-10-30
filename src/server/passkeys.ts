import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { type PasskeyView } from "@/modules/passkeys";

const CHALLENGE_COOKIE = "webauthn_challenge";
const CHALLENGE_MAX_AGE = 5 * 60;
const CHALLENGE_TYPE = "webauthn-challenge";

export type ChallengePurpose = "registration" | "authentication";

type ChallengePayload = {
  challenge: string;
  purpose: ChallengePurpose;
  uid?: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function relyingParty(request: Request) {
  const configuredOrigins = (process.env.WEBAUTHN_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = configuredOrigins.length > 0 ? configuredOrigins : [new URL(request.url).origin];
  const rpID = process.env.WEBAUTHN_RP_ID?.trim() || new URL(origins[0]).hostname;
  return {
    rpID,
    expectedOrigin: origins.length === 1 ? origins[0] : origins,
    rpName: process.env.WEBAUTHN_RP_NAME?.trim() || "TTPU LMS",
  };
}

export async function setChallengeCookie(payload: ChallengePayload) {
  const token = await new SignJWT({ ...payload, kind: CHALLENGE_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_MAX_AGE}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_MAX_AGE,
  });
}

export async function readChallengeCookie(purpose: ChallengePurpose): Promise<ChallengePayload | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.kind !== CHALLENGE_TYPE) return null;
    if (payload.purpose !== purpose) return null;
    if (typeof payload.challenge !== "string") return null;
    return {
      challenge: payload.challenge,
      purpose,
      uid: typeof payload.uid === "string" ? payload.uid : undefined,
    };
  } catch {
    return null;
  }
}

export async function clearChallengeCookie() {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE);
}

export async function listPasskeys(userId: string): Promise<PasskeyView[]> {
  const rows = await prisma.passkeyCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    deviceType: row.deviceType,
    backedUp: row.backedUp,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  }));
}

export async function countPasskeys(userId: string): Promise<number> {
  return prisma.passkeyCredential.count({ where: { userId } });
}
