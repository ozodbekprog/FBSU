import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { returnLoan } from "@/server/library";

const patchSchema = z.object({
  outcome: z.enum(["RETURNED", "LOST"]).default("RETURNED"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.circulate")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Holat yaroqsiz" }, { status: 400 });
  }

  const result = await returnLoan(id, parsed.data.outcome);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 409 });
  }
  return Response.json({ ok: true, data: { id } });
}
