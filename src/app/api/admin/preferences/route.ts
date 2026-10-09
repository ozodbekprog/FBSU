import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const WIDGETS = ["stats", "quick", "upload", "charts", "recent"] as const;

const patchSchema = z.object({
  hidden: z.array(z.enum(WIDGETS)).max(WIDGETS.length),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  const current =
    user.preferences && typeof user.preferences === "object" && !Array.isArray(user.preferences)
      ? (user.preferences as Record<string, unknown>)
      : {};
  const preferences = { ...current, adminHidden: parsed.data.hidden };

  await prisma.user.update({
    where: { id: user.id },
    data: { preferences },
  });

  return Response.json({ ok: true, data: { hidden: parsed.data.hidden } });
}
