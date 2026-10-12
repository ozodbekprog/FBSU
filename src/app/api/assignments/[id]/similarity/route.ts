import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { findPairs, maxScoreByItem } from "@/modules/antiplagiat/similarity";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }
  if (!canManageCourse(user, assignment.course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: id, text: { not: null } },
    select: {
      id: true,
      text: true,
      studentId: true,
      student: { select: { name: true } },
    },
  });

  const items = submissions
    .map((submission) => ({ id: submission.id, text: submission.text ?? "" }))
    .filter((item) => item.text.trim().length > 0);

  const pairs = findPairs(items, 0.35).slice(0, 50);
  const bySubmission = maxScoreByItem(pairs);

  return Response.json({
    ok: true,
    data: { total: items.length, pairs, bySubmission },
  });
}
