import { z } from "zod";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { recordEvent } from "@/modules/events/record";

const REGISTRAR_MANAGED_ROLES: readonly Role[] = ["STUDENT", "TEACHER"];

const ASSIGNABLE_ROLES = [
  "ADMIN",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
  "BUXGALTER",
  "TYUTOR",
  "TEACHER",
  "STUDENT",
  "XODIM",
  "OTA_ONA",
] as const;

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["activate", "deactivate", "assignGroup", "assignRole"]),
  groupId: z.string().min(1).optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }
  const { ids, action, groupId, role: nextRole } = parsed.data;

  let assignedGroupId: string | null = null;
  if (action === "assignGroup") {
    if (!groupId) {
      return Response.json({ ok: false, error: "Guruh tanlanmagan" }, { status: 400 });
    }
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!group) {
      return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 404 });
    }
    assignedGroupId = group.id;
  }

  if (action === "assignRole") {
    if (user.role !== "ADMIN") {
      return Response.json({ ok: false, error: "Rol o'zgartirishga ruxsat yo'q" }, { status: 403 });
    }
    if (!nextRole) {
      return Response.json({ ok: false, error: "Rol tanlanmagan" }, { status: 400 });
    }
  }

  const targets = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, role: true, isActive: true },
  });

  if (targets.some((target) => target.role === "OWNER")) {
    return Response.json({ ok: false, error: "OWNER akkauntiga tegib bo'lmaydi" }, { status: 403 });
  }

  if (user.role === "REGISTRAR" && targets.some((target) => !REGISTRAR_MANAGED_ROLES.includes(target.role))) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 403 });
  }

  if (action === "deactivate") {
    const deactivatingAdmins = targets.filter((target) => target.role === "ADMIN" && target.isActive).length;
    if (deactivatingAdmins > 0) {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins - deactivatingAdmins <= 0) {
        return Response.json({ ok: false, error: "Oxirgi adminni o'chirib bo'lmaydi" }, { status: 409 });
      }
    }
  }

  const result =
    action === "assignRole" && nextRole
      ? await prisma.user.updateMany({
          where: { id: { in: ids } },
          data: { role: nextRole },
        })
      : assignedGroupId !== null
        ? await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { groupId: assignedGroupId },
          })
        : await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { isActive: action === "activate" },
          });

  await recordEvent(user.id, "admin.user.update", {
    entity: "User",
    meta: {
      bulk: action,
      count: result.count,
      ids,
      ...(assignedGroupId ? { groupId: assignedGroupId } : {}),
      ...(action === "assignRole" && nextRole ? { role: nextRole } : {}),
    },
  });

  return Response.json({ ok: true, data: { updated: result.count } });
}
