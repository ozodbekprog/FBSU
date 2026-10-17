import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const patchSchema = z
  .object({
    term: z.string().trim().min(1, "Atama kiriting").max(200).optional(),
    definition: z.string().trim().min(1, "Izoh kiriting").max(5000).optional(),
  })
  .refine((value) => value.term !== undefined || value.definition !== undefined, {
    message: "O'zgartirish uchun maydon kiriting",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const entry = await prisma.glossaryEntry.findUnique({ where: { id } });
  if (!entry) {
    return Response.json({ ok: false, error: "Atama topilmadi" }, { status: 404 });
  }

  const course = await prisma.course.findUnique({ where: { id: entry.courseId } });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const updated = await prisma.glossaryEntry.update({
    where: { id: entry.id },
    data: {
      ...(parsed.data.term !== undefined ? { term: parsed.data.term } : {}),
      ...(parsed.data.definition !== undefined ? { definition: parsed.data.definition } : {}),
    },
    include: { createdBy: { select: { name: true } } },
  });

  await recordEvent(user.id, "glossary.update", {
    entity: "GlossaryEntry",
    entityId: updated.id,
    meta: { courseId: course.id, term: updated.term },
  });

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const entry = await prisma.glossaryEntry.findUnique({ where: { id } });
  if (!entry) {
    return Response.json({ ok: false, error: "Atama topilmadi" }, { status: 404 });
  }

  const course = await prisma.course.findUnique({ where: { id: entry.courseId } });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.glossaryEntry.delete({ where: { id: entry.id } });

  await recordEvent(user.id, "glossary.delete", {
    entity: "GlossaryEntry",
    entityId: entry.id,
    meta: { courseId: course.id, term: entry.term },
  });

  return Response.json({ ok: true, data: { deleted: true } });
}
