import { CompactSign, compactVerify } from "jose";

export type BadgeInput = {
  certificateId: string;
  recipientName: string;
  achievementName: string;
  achievementDescription: string;
  issuerName: string;
  issuedAt: string;
  grade: number | null;
  baseUrl: string;
};

export function badgeSlug(baseUrl: string, certificateId: string): string {
  return `${baseUrl}/api/badges/${certificateId}`;
}

export function buildBadge(input: BadgeInput): Record<string, unknown> {
  const id = badgeSlug(input.baseUrl, input.certificateId);

  const badge: Record<string, unknown> = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: `${input.baseUrl}/`,
      type: ["Profile"],
      name: input.issuerName,
    },
    validFrom: input.issuedAt,
    name: input.achievementName,
    credentialSubject: {
      id: `${id}#recipient`,
      type: ["AchievementSubject"],
      achievement: {
        id: `${id}#achievement`,
        type: ["Achievement"],
        name: input.achievementName,
        description: input.achievementDescription,
        criteria: { narrative: input.achievementDescription },
      },
    },
  };

  if (input.grade !== null) {
    (badge.credentialSubject as Record<string, unknown>).result = [
      {
        type: ["Result"],
        resultScore: {
          type: "Score",
          score: input.grade,
        },
      },
    ];
  }

  return badge;
}

export async function signBadge(
  badge: Record<string, unknown>,
  secret: string,
): Promise<Record<string, unknown>> {
  const jws = await new CompactSign(new TextEncoder().encode(JSON.stringify(badge)))
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(secret));

  return {
    ...badge,
    proof: {
      type: "DataIntegrityProof",
      cryptosuite: "hmac-sha256",
      proofPurpose: "assertionMethod",
      created: new Date().toISOString(),
      jws,
    },
  };
}

function cloneWithoutProof(signed: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(signed)) {
    if (key !== "proof") clone[key] = signed[key];
  }
  return clone;
}

export async function verifyBadge(
  signed: Record<string, unknown>,
  secret: string,
): Promise<boolean> {
  try {
    const proof = signed.proof as { jws?: unknown } | undefined;
    if (!proof || typeof proof.jws !== "string") return false;

    const payload = cloneWithoutProof(signed);
    const { payload: verified } = await compactVerify(
      proof.jws,
      new TextEncoder().encode(secret),
    );

    return new TextDecoder().decode(verified) === JSON.stringify(payload);
  } catch {
    return false;
  }
}
