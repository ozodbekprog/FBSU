import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { handleProfileImageUpload } from "@/app/api/profile/image-upload";

const REGISTRAR_MANAGED_ROLES: readonly Role[] = ["STUDENT", "TEACHER"];

function canManageUsers(role: Role) {
  return role === "ADMIN" || role === "OWNER" || role === "REGISTRAR";
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(user.role)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return Response.json({ ok: false, error: "Foydalanuvchi topilmadi" }, { status: 404 });
  if (target.role === "OWNER" && user.role !== "OWNER") {
    return Response.json({ ok: false, error: "OWNER akkauntiga ruxsat yo'q" }, { status: 403 });
  }
  if (user.role === "REGISTRAR" && !REGISTRAR_MANAGED_ROLES.includes(target.role)) {
    return Response.json({ ok: false, error: "Bu foydalanuvchini boshqarishga ruxsat yo'q" }, { status: 403 });
  }

  return handleProfileImageUpload(request, {
    subdir: "avatars",
    maxSize: 30 * 1024 * 1024,
    maxSizeLabel: "30MB",
    field: "avatarUrl",
    targetUserId: target.id,
  });
}
