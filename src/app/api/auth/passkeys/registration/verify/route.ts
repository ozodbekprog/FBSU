import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { passkeyName } from "@/modules/passkeys";
import { clearChallengeCookie, readChallengeCookie, relyingParty } from "@/server/passkeys";

type Body = {
  response?: RegistrationResponseJSON;
  name?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.response || typeof body.response.id !== "string") {
    return Response.json({ ok: false, error: "Passkey javobi noto'g'ri" }, { status: 400 });
  }

  const challenge = await readChallengeCookie("registration");
  if (!challenge || challenge.uid !== user.id) {
    return Response.json(
      { ok: false, error: "Passkey sessiyasi muddati tugadi. Qaytadan urinib ko'ring" },
      { status: 400 },
    );
  }

  const { rpID, expectedOrigin } = relyingParty(request);

  let info: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    info = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    return Response.json({ ok: false, error: "Passkey tasdiqlanmadi" }, { status: 400 });
  } finally {
    await clearChallengeCookie();
  }

  if (!info.verified) {
    return Response.json({ ok: false, error: "Passkey tasdiqlanmadi" }, { status: 400 });
  }

  const credential = info.registrationInfo.credential;
  const clientInfo = getClientInfo(request);

  try {
    await prisma.passkeyCredential.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        counter: BigInt(credential.counter),
        transports: credential.transports?.join(",") ?? null,
        deviceType: info.registrationInfo.credentialDeviceType,
        backedUp: info.registrationInfo.credentialBackedUp,
        name: passkeyName(body.name),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { ok: false, error: "Bu qurilma allaqachon ulangan" },
        { status: 409 },
      );
    }
    throw error;
  }

  await createAuditLog({
    action: "SETTINGS_CHANGE",
    entity: "User",
    entityId: user.id,
    meta: { email: user.email, setting: "passkey_added" },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: { id: credential.id } });
}
