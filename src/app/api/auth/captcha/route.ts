import { createCaptchaChallenge } from "@/lib/captcha";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export async function GET(request: Request) {
  const ip = getClientIp(request.headers) ?? "local";
  const limit = await checkRateLimit(`captcha:${ip}`, {
    windowMs: 60 * 1000,
    maxAttempts: 20,
    keyPrefix: "auth",
  });
  if (!limit.allowed) {
    return Response.json({ ok: false, error: "Juda ko'p so'rov" }, { status: 429 });
  }

  const challenge = await createCaptchaChallenge();
  return Response.json(
    { ok: true, data: challenge },
    { headers: { "Cache-Control": "no-store" } },
  );
}
