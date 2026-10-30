import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { DEFAULT_LOAN_DAYS } from "@/modules/library";
import { getActiveLoans, issueLoan } from "@/server/library";

const issueSchema = z.object({
  copyId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  days: z.number().int().min(1).max(180).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.circulate")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ ok: true, data: await getActiveLoans() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.circulate")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kitob va talabani tanlang" }, { status: 400 });
  }

  const result = await issueLoan({
    copyId: parsed.data.copyId,
    userId: parsed.data.userId,
    issuedById: user.id,
    days: parsed.data.days ?? DEFAULT_LOAN_DAYS,
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 409 });
  }
  return Response.json({ ok: true, data: { id: result.id } }, { status: 201 });
}
