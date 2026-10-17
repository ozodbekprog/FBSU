import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { recordEvent } from "@/modules/events/record";

const materialTypeSchema = z.enum(["TEXT", "FILE", "VIDEO", "LINK"]);

const backupSchema = z.object({
  format: z.literal("fbsu-course"),
  version: z.literal(1),
  course: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).nullable().optional(),
    coverColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    isPublished: z.boolean().optional(),
    isElective: z.boolean().optional(),
    selfEnrollment: z.boolean().optional(),
  }),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        position: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
  materials: z
    .array(
      z.object({
        sectionIndex: z.number().int().min(0).nullable().optional(),
        title: z.string().trim().min(1).max(200),
        type: materialTypeSchema.optional(),
        content: z.string().max(20000).nullable().optional(),
        fileUrl: z.string().max(2000).nullable().optional(),
        position: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
  assignments: z
    .array(
      z.object({
        sectionIndex: z.number().int().min(0).nullable().optional(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(5000).nullable().optional(),
        maxScore: z.number().int().min(1).max(1000).optional(),
        dueAt: z.string().nullable().optional(),
      }),
    )
    .optional(),
  quizzes: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(5000).nullable().optional(),
        timeLimitMin: z.number().int().min(1).max(1000).nullable().optional(),
        maxAttempts: z.number().int().min(1).max(100).optional(),
        isPublished: z.boolean().optional(),
        dueAt: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "kurs";
}

async function uniqueSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (await prisma.course.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = backupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Fayl formati noto'g'ri yoki kurs nomi yo'q" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const title = `${data.course.title} (import)`.slice(0, 200);
    const slug = await uniqueSlug(title);

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description: data.course.description ?? null,
        coverColor: data.course.coverColor ?? "#2563eb",
        isPublished: data.course.isPublished ?? false,
        isElective: data.course.isElective ?? false,
        selfEnrollment: data.course.selfEnrollment ?? false,
        teacherId: user.id,
      },
    });

    const sectionIds: string[] = [];
    for (const [index, section] of (data.sections ?? []).entries()) {
      const created = await prisma.section.create({
        data: {
          courseId: course.id,
          title: section.title,
          position: section.position ?? index,
        },
      });
      sectionIds.push(created.id);
    }

    for (const [index, material] of (data.materials ?? []).entries()) {
      const sectionId =
        material.sectionIndex !== undefined && material.sectionIndex !== null
          ? sectionIds[material.sectionIndex]
          : undefined;
      if (!sectionId) continue;
      await prisma.material.create({
        data: {
          sectionId,
          title: material.title,
          type: material.type ?? "TEXT",
          content: material.content ?? null,
          fileUrl: material.fileUrl ?? null,
          position: material.position ?? index,
        },
      });
    }

    for (const assignment of data.assignments ?? []) {
      const sectionId =
        assignment.sectionIndex !== undefined && assignment.sectionIndex !== null
          ? sectionIds[assignment.sectionIndex]
          : undefined;
      await prisma.assignment.create({
        data: {
          courseId: course.id,
          sectionId: sectionId ?? null,
          title: assignment.title,
          description: assignment.description ?? null,
          maxScore: assignment.maxScore ?? 100,
          dueAt: parseDate(assignment.dueAt),
        },
      });
    }

    for (const quiz of data.quizzes ?? []) {
      await prisma.quiz.create({
        data: {
          courseId: course.id,
          title: quiz.title,
          description: quiz.description ?? null,
          timeLimitMin: quiz.timeLimitMin ?? null,
          maxAttempts: quiz.maxAttempts ?? 1,
          isPublished: quiz.isPublished ?? false,
          dueAt: parseDate(quiz.dueAt),
        },
      });
    }

    await recordEvent(user.id, "course.import", {
      entity: "Course",
      entityId: course.id,
      meta: { sourceTitle: data.course.title },
    });

    return Response.json({
      ok: true,
      data: { courseId: course.id, slug: course.slug, title: course.title },
    });
  } catch {
    return Response.json({ ok: false, error: "Import amalga oshmadi" }, { status: 500 });
  }
}
