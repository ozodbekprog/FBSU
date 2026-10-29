import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { hasCapability } from "./has";
import type { Capability } from "./registry";

export type ApiGuard =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; response: Response };

export async function requireApiCapability(capability: Capability): Promise<ApiGuard> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!hasCapability(user.role, capability)) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

export async function requirePageCapability(capability: Capability) {
  const user = await requireUser();
  if (!hasCapability(user.role, capability)) redirect("/dashboard");
  return user;
}
