import { getCurrentUser } from "@/lib/auth";
import { getMyLoans } from "@/server/library";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  return Response.json({ ok: true, data: await getMyLoans(user.id) });
}
