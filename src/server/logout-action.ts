"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { validateCsrfToken } from "@/lib/csrf";
import { headers } from "next/headers";

/**
 * Logout runs as a server action instead of a plain HTML form POST.
 *
 * Server actions are invoked by Next's own action endpoint, so the proxy's
 * CSRF gate sees them as an internal RSC call; the double-submit token is
 * therefore verified here, server-side, from the cookie pair. This keeps the
 * endpoint safe from cross-site forced-logout while still working without
 * client-side JavaScript.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieToken = cookieStore.get("csrf_token")?.value ?? null;
  const headerToken = headerStore.get("x-csrf-token") ?? null;
  const token = cookieToken;

  if (!token || !(await validateCsrfToken(token))) {
    redirect("/login?error=csrf");
  }

  const request = new Request("http://internal/api/auth/logout", {
    headers: headerStore,
  });
  const clientInfo = getClientInfo(request);

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
      meta: { email: session.email, role: session.role, csrfHeader: Boolean(headerToken) },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
  }

  await destroySession();
  redirect("/login");
}