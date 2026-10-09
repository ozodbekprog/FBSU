import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { ADMISSION_MANAGE_ROLES } from "../admissions/shared";

const createSchema = z.object({
  name: z.string().trim().min(3).max(160),
  code: z.string().trim().max(20).nullable().optional(),
  quota: z.number().int().min(1).max(2000),
});

const patchSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(3).max(160).optional(),
  quota: z.number().int().min(1).max(2000).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!ADMISSION_MANAGE_ROLES.includes(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Yo'nalish ma'lumotlari to'liq emas" }, { status: 400 });
  }

  const program = await prisma.admissionProgram.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code || null,
      quota: parsed.data.quota,
    },
  });
  return Response.json({ ok: true, data: program }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!ADMISSION_MANAGE_ROLES.includes(user.role)) {
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

  const program = await prisma.admissionProgram.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      quota: parsed.data.quota,
      isActive: parsed.data.isActive,
    },
  });
  return Response.json({ ok: true, data: program });
}
