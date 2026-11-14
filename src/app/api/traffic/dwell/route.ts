import { cookies } from "next/headers";
import { TRAFFIC_VISITOR_COOKIE } from "@/modules/traffic/types";
import { recordTrafficDwell } from "@/modules/traffic/ingest";

export const dynamic = "force-dynamic";

function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return site === "same-origin" || site === "none";
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function noContent() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });

  try {
    const body = (await request.json()) as { path?: unknown; ms?: unknown };
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
    const ms = Number(body.ms);
    if (!path.startsWith("/") || !Number.isFinite(ms)) return noContent();

    const store = await cookies();
    const visitorId = store.get(TRAFFIC_VISITOR_COOKIE)?.value;
    if (!visitorId) return noContent();

    await recordTrafficDwell(visitorId, path, ms);
  } catch (error) {
    console.error("[traffic] dwell yozilmadi", error);
  }
  return noContent();
}
