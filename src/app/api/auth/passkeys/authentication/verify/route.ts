import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { DeviceLimitError } from "@/lib/device";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { clearChallengeCookie, readChallengeCookie, relyingParty } from "@/server/passkeys";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

type Body = { response?: AuthenticationResponseJSON; remember?: unknown };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const ip = getClientIp(request.headers) ?? "local";
  const limit = await checkRateLimit(`passkey-verify:${ip}`, {
    windowMs: WINDOW_MS,
    maxAttempts: MAX_ATTEMPTS,
    keyPrefix: "auth",
  });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.response || typeof body.response.id !== "string") {
    return Response.json({ ok: false, error: "Passkey javobi noto'g'ri" }, { status: 400 });
  }

  const challenge = await readChallengeCookie("authentication");
  if (!challenge) {
    return Response.json(
      { ok: false, error: "Passkey sessiyasi muddati tugadi. Qaytadan urinib ko'ring" },
      { status: 400 },
    );
  }

  const stored = await prisma.passkeyCredential.findUnique({
    where: { credentialId: body.response.id },
    include: { user: true },
  });
  if (!stored) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      meta: { reason: "passkey_unknown_credential" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Passkey tasdiqlanmadi" }, { status: 401 });
  }
  if (stored.user.role === "OWNER") {
    return Response.json(
      { ok: false, error: "OWNER hisobida passkey o'chirilgan — Telegram 2FA ishlatiladi" },
      { status: 403 },
    );
  }
  if (challenge.uid && challenge.uid !== stored.userId) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: stored.userId,
      meta: { reason: "passkey_user_mismatch" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Passkey tasdiqlanmadi" }, { status: 401 });
  }

  const { rpID, expectedOrigin } = relyingParty(request);

  let verified = false;
  let newCounter = Number(stored.counter);
  try {
    const result = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: Number(stored.counter),
        transports: stored.transports
          ? (stored.transports.split(",") as AuthenticatorTransportFuture[])
          : undefined,
      },
      requireUserVerification: true,
    });
    verified = result.verified;
    if (result.verified) newCounter = result.authenticationInfo.newCounter;
  } catch {
    verified = false;
  } finally {
    await clearChallengeCookie();
  }

  if (!verified) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: stored.userId,
      meta: { email: stored.user.email, reason: "passkey_verification_failed" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "Passkey tasdiqlanmadi" }, { status: 401 });
  }

  const user = stored.user;
  if (!user.isActive) {
    return Response.json({ ok: false, error: "Hisob faol emas" }, { status: 403 });
  }

  await prisma.passkeyCredential.update({
    where: { id: stored.id },
    data: { counter: BigInt(newCounter), lastUsedAt: new Date() },
  });

  try {
    await createSession(user, { remember: body.remember === true });
  } catch (error) {
    if (error instanceof DeviceLimitError) {
      return Response.json(
        {
          ok: false,
          code: "DEVICE_LIMIT",
          error:
            "Bu hisobga faqat 2 ta qurilma ulanadi. Eski qurilmalardan birini uzib, qayta urinib ko'ring.",
        },
        { status: 403 },
      );
    }
    throw error;
  }
  await createAuditLog({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    meta: { email: user.email, role: user.role, method: "passkey" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });
}
