import { destroySession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";

/**
 * The logout button is a plain HTML form, so the browser cannot attach the
 * `x-csrf-token` header. We accept the double-submit token either from that
 * header (fetch/API clients) or from the `csrf_token` form field, which keeps
 * cross-site forced-logout blocked while the no-JS form keeps working.
 */
async function hasValidCsrf(request: Request): Promise<boolean> {
  const header = request.headers.get("x-csrf-token");
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const cookie = store.get("csrf_token")?.value ?? null;
  const headerToken = header ?? null;

  let bodyToken: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData().catch(() => null);
    const value = form?.get("csrf_token");
    if (typeof value === "string") bodyToken = value;
  }

  const token = headerToken ?? bodyToken;
  if (!token || !cookie || token !== cookie) return false;

  const { validateCsrfToken } = await import("@/lib/csrf");
  return validateCsrfToken(token);
}

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);

  if (!(await hasValidCsrf(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const session = await getSession();
  if (session) {
    await prisma.user.updateMany({
      where: { id: session.uid },
      data: { sessionEpoch: { increment: 1 } },
    });
    await createAuditLog({
      action: "LOGOUT",
      entity: "User",
      entityId: session.uid,
      meta: { email: session.email, role: session.role },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
  }
  await destroySession();
  // Nisbiy Location ishlatiladi: `-H 0.0.0.0` bilan ishga tushganda
  // request.url bog'lanish manzilini (0.0.0.0) beradi va brauzer uni ocholmaydi.
  return new Response(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}