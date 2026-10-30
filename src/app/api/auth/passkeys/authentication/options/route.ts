import { generateAuthenticationOptions, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { setChallengeCookie, relyingParty } from "@/server/passkeys";

type Body = { email?: unknown };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

export async function POST(request: Request) {
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const ip = getClientIp(request.headers) ?? "local";
  const limit = await checkRateLimit(`passkey-options:${ip}`, {
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
  const rawEmail = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const email = rawEmail.length > 0 ? rawEmail : null;

  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;
  let uid: string | undefined;

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        isActive: true,
        passkeys: { select: { credentialId: true, transports: true } },
      },
    });
    if (!user || !user.isActive || user.passkeys.length === 0) {
      return Response.json({ ok: false, error: "Bu hisobda passkey topilmadi" }, { status: 404 });
    }
    if (user.role === "OWNER") {
      return Response.json(
        { ok: false, error: "OWNER hisobida passkey o'chirilgan — Telegram 2FA ishlatiladi" },
        { status: 403 },
      );
    }
    uid = user.id;
    allowCredentials = user.passkeys.map((item) => ({
      id: item.credentialId,
      transports: item.transports
        ? (item.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    }));
  }

  const { rpID } = relyingParty(request);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
  });

  await setChallengeCookie({ challenge: options.challenge, purpose: "authentication", uid });

  return Response.json({ ok: true, data: options });
}
