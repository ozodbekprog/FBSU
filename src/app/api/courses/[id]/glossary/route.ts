import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const createSchema = z.object({
  term: z.string().trim().min(1, "Atama kiriting").max(200),
  definition: z.string().trim().min(1, "Izoh kiriting").max(5000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }

  const canManage = canManageCourse(user, course);
  if (!canManage) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id, userId: user.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!enrollment) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const entries = await prisma.glossaryEntry.findMany({
    where: {
      courseId: course.id,
      ...(q
        ? {
            OR: [
              { term: { contains: q, mode: "insensitive" } },
              { definition: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { term: "asc" },
    include: { createdBy: { select: { name: true } } },
  });

  return Response.json({ ok: true, data: { entries, canManage } });
}

export async function POST(
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
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const created = await prisma.glossaryEntry.create({
    data: {
      courseId: course.id,
      term: parsed.data.term,
      definition: parsed.data.definition,
      createdById: user.id,
    },
    include: { createdBy: { select: { name: true } } },
  });

  await recordEvent(user.id, "glossary.create", {
    entity: "GlossaryEntry",
    entityId: created.id,
    meta: { courseId: course.id, term: created.term },
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}
