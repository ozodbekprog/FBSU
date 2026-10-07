import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchAll } from "@/components/search/search-data";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`search:${user.id}`, {
    windowMs: 60_000,
    maxAttempts: 60,
    keyPrefix: "api",
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p qidiruv. Keyinroq qayta urinib ko'ring" },
      { status: 429 },
    );
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const data = await searchAll(user, q);

  return Response.json({ ok: true, data });
}
