import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { isOfficeMeta, normalizeOfficeBody } from "@/lib/office";
import { sanitizeHtml } from "@/lib/openboard/sanitize";

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().max(2_000_000).optional(),
  })
  .refine((value) => value.title !== undefined || value.body !== undefined, {
    message: "Bo'sh so'rov",
  });

type RouteContext = { params: Promise<{ id: string }> };

async function loadDocument(id: string, userId: string, isAdmin: boolean) {
  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      meta: true,
      createdById: true,
      updatedAt: true,
    },
  });
  if (!document || !isOfficeMeta(document.meta)) return null;
  if (document.createdById !== userId && !isAdmin) return null;
  return { ...document, officeType: document.meta.officeType };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const document = await loadDocument(id, user.id, user.role === "ADMIN");
  if (!document) return Response.json({ ok: false, error: "Topilmadi" }, { status: 404 });

  return Response.json({
    ok: true,
    data: {
      id: document.id,
      title: document.title,
      type: document.officeType,
      body: document.body,
      updatedAt: document.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const { id } = await context.params;
  const document = await loadDocument(id, user.id, user.role === "ADMIN");
  if (!document) return Response.json({ ok: false, error: "Topilmadi" }, { status: 404 });

  const payload = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  let body: string | undefined;
  if (parsed.data.body !== undefined) {
    let raw: unknown;
    try {
      raw = JSON.parse(parsed.data.body);
    } catch {
      return Response.json({ ok: false, error: "Fayl formati buzilgan" }, { status: 400 });
    }
    const normalized = normalizeOfficeBody(document.officeType, raw);
    if (!normalized) {
      return Response.json({ ok: false, error: "Fayl formati mos emas" }, { status: 400 });
    }
    body = JSON.stringify(
      "html" in normalized ? { ...normalized, html: sanitizeHtml(normalized.html, { allowStyle: true }) } : normalized,
    );
  }

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(body !== undefined ? { body } : {}),
    },
    select: { id: true, title: true, updatedAt: true },
  });

  return Response.json({
    ok: true,
    data: {
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const { id } = await context.params;
  const document = await loadDocument(id, user.id, user.role === "ADMIN");
  if (!document) return Response.json({ ok: false, error: "Topilmadi" }, { status: 404 });

  await prisma.document.delete({ where: { id: document.id } });
  return Response.json({ ok: true, data: { id: document.id } });
}
