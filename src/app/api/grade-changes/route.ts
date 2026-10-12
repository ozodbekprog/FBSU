import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const isReviewer =
    user.role === "ADMIN" || user.role === "REGISTRAR" || user.role === "REKTOR";
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "PENDING" || statusParam === "APPROVED" || statusParam === "REJECTED"
      ? statusParam
      : undefined;

  const requests = await prisma.gradeChangeRequest.findMany({
    where: {
      ...(isReviewer ? {} : { requestedById: user.id }),
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      submission: {
        select: {
          id: true,
          student: { select: { id: true, name: true, avatarUrl: true } },
          assignment: {
            select: {
              id: true,
              title: true,
              maxScore: true,
              course: { select: { slug: true, title: true } },
            },
          },
        },
      },
      requestedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  return Response.json({ ok: true, data: requests });
}
