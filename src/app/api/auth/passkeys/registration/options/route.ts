import { generateRegistrationOptions, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { PASSKEY_LIMIT } from "@/modules/passkeys";
import { relyingParty, setChallengeCookie } from "@/server/passkeys";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }
  if (user.role === "OWNER") {
    return Response.json(
      { ok: false, error: "OWNER hisobida passkey o'chirilgan — Telegram 2FA ishlatiladi" },
      { status: 403 },
    );
  }

  const existing = await prisma.passkeyCredential.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });
  if (existing.length >= PASSKEY_LIMIT) {
    return Response.json(
      { ok: false, error: `Bitta hisobga ${PASSKEY_LIMIT} tagacha passkey ulash mumkin` },
      { status: 409 },
    );
  }

  const { rpID, rpName } = relyingParty(request);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    excludeCredentials: existing.map((item) => ({
      id: item.credentialId,
      transports: item.transports
        ? (item.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await setChallengeCookie({ challenge: options.challenge, purpose: "registration", uid: user.id });

  return Response.json({ ok: true, data: options });
}
