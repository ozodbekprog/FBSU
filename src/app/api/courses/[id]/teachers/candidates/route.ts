import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/components/courses/course-access";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const course = await prisma.course.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return Response.json({ ok: true, data: { users: [] } });
  }

  const current = await prisma.courseTeacher.findMany({
    where: { courseId: course.id },
    select: { userId: true },
  });
  const excluded = new Set([course.teacherId, ...current.map((row) => row.userId)]);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["TEACHER", "ADMIN"] },
      id: { notIn: Array.from(excluded) },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  return Response.json({ ok: true, data: { users } });
}
