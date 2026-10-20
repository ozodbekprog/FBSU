import { revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { EDUPAGE_CACHE_TAG } from "@/lib/edupage";
import { EduPageSyncBusyError, syncEduPageSchedule } from "@/lib/edupage-sync";

const MANAGE_ROLES = new Set(["ADMIN", "REGISTRAR"]);

function cronSecret(): string | null {
  const secret = (process.env.EDUPAGE_SYNC_SECRET || process.env.CRON_SECRET || "").trim();
  return secret.length > 0 ? secret : null;
}

function hasCronAccess(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}` || new URL(request.url).searchParams.get("secret") === secret;
}

async function runSync() {
  const result = await syncEduPageSchedule();
  revalidateTag(EDUPAGE_CACHE_TAG, "max");
  return Response.json({ ok: true, data: result });
}

function failure(error: unknown) {
  if (error instanceof EduPageSyncBusyError) {
    return Response.json({ ok: false, error: error.message }, { status: 409 });
  }
  const message = error instanceof Error ? error.message : "EduPage bilan aloqa xatosi";
  return Response.json({ ok: false, error: message }, { status: 502 });
}

export async function GET(request: Request) {
  if (!hasCronAccess(request)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  try {
    return await runSync();
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  if (!hasCronAccess(request)) {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!MANAGE_ROLES.has(user.role)) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const csrfValid = await verifyCsrfFromRequest(request);
    if (!csrfValid) {
      return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
    }
  }

  try {
    return await runSync();
  } catch (error) {
    return failure(error);
  }
}
