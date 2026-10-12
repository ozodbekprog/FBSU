import { getCurrentUser } from "@/lib/auth";
import { canViewAccessLogs } from "@/modules/roles/access";
import { parseAccessHistoryFilters } from "@/modules/access/history";
import { getAccessHistory } from "@/server/access-history";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!canViewAccessLogs(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Filtrlar: q (shaxs ismi), direction (IN/OUT), allowed (allowed/denied),
  // range (today/week/month/all), page — sahifalab yuklash uchun.
  const filters = parseAccessHistoryFilters(new URL(request.url).searchParams);
  const data = await getAccessHistory(filters);

  return Response.json({ ok: true, data });
}
