import { prisma } from "@/lib/prisma";
import { requireApiToken } from "@/modules/api-auth/token";

export async function GET(request: Request) {
  const auth = await requireApiToken(request);
  if (!auth.ok) return auth.response;

  const { user } = auth;
  const select = { id: true, slug: true, title: true } as const;

  const courses =
    user.role === "ADMIN" || user.role === "OWNER"
      ? await prisma.course.findMany({ select, orderBy: { createdAt: "asc" }, take: 50 })
      : user.role === "TEACHER"
        ? await prisma.course.findMany({
            where: { teacherId: user.id },
            select,
            orderBy: { createdAt: "asc" },
          })
        : await prisma.course.findMany({
            where: { enrollments: { some: { userId: user.id, status: "ACTIVE" } } },
            select,
            orderBy: { createdAt: "asc" },
          });

  return Response.json({ ok: true, data: courses });
}
