import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getClientInfo } from "@/lib/audit";
import { logAudit } from "@/server/audit";
import { getMaintenanceMode, setMaintenanceMode } from "@/server/maintenance";

const maintenanceSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const enabled = await getMaintenanceMode();
  return Response.json({ ok: true, data: { enabled } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Maintenance holati noto'g'ri" }, { status: 400 });
  }

  const enabled = await setMaintenanceMode(parsed.data.enabled);

  await logAudit({
    actorId: user.id,
    action: "MAINTENANCE_TOGGLE",
    entity: "AppSetting",
    entityId: "maintenance_mode",
    meta: { enabled },
    ...getClientInfo(request),
  });

  return Response.json({ ok: true, data: { enabled } });
}
