import { getSession } from "@/lib/auth";
import { verifyTrafficHit } from "@/modules/traffic/signature";
import { recordTrafficHit } from "@/modules/traffic/ingest";

export const dynamic = "force-dynamic";

function headerText(request: Request, name: string, max: number): string | null {
  const raw = request.headers.get(name);
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    value = raw;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function countryLabel(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["uz"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function noContent() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const ts = request.headers.get("x-traffic-ts") ?? "";
    const visitorId = request.headers.get("x-traffic-visitor") ?? "";
    const path = headerText(request, "x-traffic-path", 300);
    const signature = request.headers.get("x-traffic-sig") ?? "";

    if (!ts || !visitorId || !path || !signature) return noContent();
    if (!path.startsWith("/")) return noContent();
    if (!verifyTrafficHit(ts, visitorId, path, signature)) {
      return new Response(null, { status: 403 });
    }

    const session = await getSession().catch(() => null);

    await recordTrafficHit({
      visitorId: visitorId.slice(0, 80),
      path,
      query: headerText(request, "x-traffic-query", 500),
      referrer: headerText(request, "x-traffic-ref", 500),
      ip: headerText(request, "x-traffic-ip", 45) ?? "unknown",
      userAgent: headerText(request, "x-traffic-ua", 512),
      isRsc: request.headers.get("x-traffic-rsc") === "1",
      userId: session?.uid ?? null,
      loginId: session?.sid ?? null,
      deviceId: session?.did ?? null,
      city: headerText(request, "x-traffic-city", 120),
      region: headerText(request, "x-traffic-region", 120),
      country: countryLabel(headerText(request, "x-traffic-country", 8)),
    });
  } catch (error) {
    console.error("[traffic] hit yozilmadi", error);
  }
  return noContent();
}
