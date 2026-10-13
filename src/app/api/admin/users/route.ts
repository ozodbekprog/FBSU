import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSelect } from "./select";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { getClientIp as getClientIpFromHeaders } from "@/lib/client-ip";

const ROLES = ["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR", "BUXGALTER", "TYUTOR", "TEACHER", "STUDENT", "XODIM", "OTA_ONA", "NAZORATCHI"] as const;

const REGISTRAR_MANAGED_ROLES: readonly Role[] = ["STUDENT", "TEACHER"];

const PAGE_SIZE = 50;

function canManageUsers(role: Role) {
  return role === "ADMIN" || role === "REGISTRAR";
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(12).max(100),
  role: z.enum(ROLES),
  groupId: z.string().trim().min(1).nullable().optional(),
  departmentId: z.string().trim().min(1).nullable().optional(),
});

function getClientIp(request: Request) {
  return getClientIpFromHeaders(request.headers) ?? "local";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(user.role)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role");
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (user.role === "REGISTRAR") {
    if (role && REGISTRAR_MANAGED_ROLES.includes(role as Role)) {
      where.role = role as Role;
    } else {
      where.role = { in: [...REGISTRAR_MANAGED_ROLES] };
    }
  } else if (role && ROLES.includes(role as Role)) {
    where.role = role as Role;
  }

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return Response.json({ ok: true, data: users });
}

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    await createAuditLog({
      action: "USER_CREATE",
      meta: { reason: "csrf_invalid" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(user.role)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const limitKey = `admin:create_user:${getClientIp(request)}`;
  const rateLimit = await checkRateLimit(limitKey, {
    windowMs: 60 * 60 * 1000,
    maxAttempts: 20,
    keyPrefix: "api",
  });

  if (!rateLimit.allowed) {
    await createAuditLog({
      action: "USER_CREATE",
      meta: { reason: "rate_limited" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json(
      { ok: false, error: "Juda ko'p urinish. Keyinroq qayta urinib ko'ring" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar to'liq emas yoki xato" }, { status: 400 });
  }

  if (user.role === "REGISTRAR" && !REGISTRAR_MANAGED_ROLES.includes(parsed.data.role)) {
    return Response.json({ ok: false, error: "Bu rolni yaratishga ruxsat yo'q" }, { status: 403 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ ok: false, error: "Bu email band" }, { status: 409 });

  if (parsed.data.groupId) {
    const group = await prisma.group.findUnique({ where: { id: parsed.data.groupId } });
    if (!group) return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      groupId: parsed.data.groupId ?? null,
      departmentId: parsed.data.departmentId ?? null,
    },
    select: userSelect,
  });

  await createAuditLog({
    action: "USER_CREATE",
    entity: "User",
    entityId: created.id,
    meta: { email, role: created.role, createdBy: user.id },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}