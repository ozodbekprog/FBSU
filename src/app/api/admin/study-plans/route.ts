import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";

const createSchema = z.object({
  groupId: z.string().trim().min(1),
  courseId: z.string().trim().min(1),
  termId: z.string().trim().min(1).nullable().optional(),
});

const deleteSchema = z.object({
  id: z.string().trim().min(1),
});

function forbidden() {
  return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) return forbidden();

  const plans = await prisma.studyPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { id: true, name: true, _count: { select: { users: true } } } },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          teacher: { select: { id: true, name: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      },
      term: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return Response.json({ ok: true, data: plans });
}

/**
 * O'quv reja: guruh kursga biriktiriladi va guruhning BARCHA aktiv talabalari
 * kursga avtomatik yoziladi (universitet modeli — talaba o'zi tanlamaydi).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) return forbidden();

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const [group, course] = await Promise.all([
    prisma.group.findUnique({ where: { id: parsed.data.groupId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: parsed.data.courseId }, select: { id: true } }),
  ]);
  if (!group) return Response.json({ ok: false, error: "Guruh topilmadi" }, { status: 404 });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });

  if (parsed.data.termId) {
    const term = await prisma.term.findUnique({ where: { id: parsed.data.termId }, select: { id: true } });
    if (!term) return Response.json({ ok: false, error: "Semestr topilmadi" }, { status: 404 });
  }

  const existing = await prisma.studyPlan.findUnique({
    where: { groupId_courseId: { groupId: group.id, courseId: course.id } },
  });
  if (existing) {
    return Response.json({ ok: false, error: "Bu guruh allaqachon kursga biriktirilgan" }, { status: 409 });
  }

  const students = await prisma.user.findMany({
    where: { groupId: group.id, role: "STUDENT", isActive: true },
    select: { id: true },
  });

  const [plan] = await prisma.$transaction([
    prisma.studyPlan.create({
      data: {
        groupId: group.id,
        courseId: course.id,
        termId: parsed.data.termId ?? null,
        createdById: user.id,
      },
      include: {
        group: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
      },
    }),
    prisma.enrollment.createMany({
      data: students.map((student) => ({ courseId: course.id, userId: student.id, status: "ACTIVE" as const })),
      skipDuplicates: true,
    }),
    prisma.enrollment.updateMany({
      where: {
        courseId: course.id,
        userId: { in: students.map((student) => student.id) },
        status: "PENDING",
      },
      data: { status: "ACTIVE" },
    }),
  ]);

  return Response.json({ ok: true, data: { plan, enrolledCount: students.length } }, { status: 201 });
}

/**
 * Reja o'chiriladi — yozilgan enrollmentlar saqlanadi (talabalar kursni tugatadi).
 */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) return forbidden();

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const plan = await prisma.studyPlan.findUnique({ where: { id: parsed.data.id } });
  if (!plan) return Response.json({ ok: false, error: "Reja topilmadi" }, { status: 404 });

  await prisma.studyPlan.delete({ where: { id: plan.id } });
  return Response.json({ ok: true, data: { id: plan.id } });
}
