import "server-only";
import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const TTL_SECONDS = 5 * 60;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type CaptchaChallenge = {
  token: string;
  question: string;
  expiresAt: string;
};

function answerHash(answer: number, nonce: string) {
  return createHash("sha256").update(`${answer}:${nonce}`).digest("hex");
}

export async function createCaptchaChallenge(): Promise<CaptchaChallenge> {
  const left = randomInt(10, 60);
  const right = randomInt(2, 9);
  const plus = randomInt(0, 2) === 0;
  const answer = plus ? left + right : left - right;
  const nonce = randomUUID();

  const token = await new SignJWT({ captcha: answerHash(answer, nonce), nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secretKey());

  return {
    token,
    question: `${left} ${plus ? "+" : "−"} ${right}`,
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
  };
}

export async function verifyCaptcha(
  token: string | undefined,
  answer: string | undefined,
): Promise<boolean> {
  if (!token || !answer) return false;
  const parsedAnswer = Number(answer);
  if (!Number.isInteger(parsedAnswer)) return false;

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.captcha !== "string" || typeof payload.nonce !== "string") return false;

    const actual = Buffer.from(answerHash(parsedAnswer, payload.nonce), "hex");
    const expected = Buffer.from(payload.captcha, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
