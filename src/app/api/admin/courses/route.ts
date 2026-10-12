import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { createAuditLog, getClientInfo } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  teacherId: z.string().trim().min(1).optional(),
  isPublished: z.boolean().default(false),
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

export async function POST(request: Request) {
  const clientInfo = getClientInfo(request);

  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    await createAuditLog({
      action: "COURSE_CREATE",
      meta: { reason: "csrf_invalid", endpoint: "admin/courses" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kurs ma'lumotlari to'liq emas" }, { status: 400 });
  }

  const teacherId = parsed.data.teacherId ?? user.id;
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  if (!teacher || !teacher.isActive || (teacher.role !== "TEACHER" && teacher.role !== "ADMIN")) {
    return Response.json({ ok: false, error: "O'qituvchi topilmadi" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      slug: await uniqueSlug(parsed.data.title),
      description: parsed.data.description || null,
      teacherId,
      isPublished: parsed.data.isPublished,
    },
    include: { teacher: { select: { id: true, name: true, email: true } } },
  });

  await createAuditLog({
    action: "COURSE_CREATE",
    entity: "Course",
    entityId: course.id,
    meta: { title: course.title, slug: course.slug, createdBy: user.id },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return Response.json({ ok: true, data: course }, { status: 201 });
}
