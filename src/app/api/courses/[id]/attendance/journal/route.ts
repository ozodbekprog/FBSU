import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { getAttendanceJournal } from "./data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }

  if (user.role === "STUDENT") {
    const enrolled = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: user.id } },
      select: { status: true },
    });
    if (enrolled?.status !== "ACTIVE") {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const data = await getAttendanceJournal(course.id, user.id);
    return Response.json({ ok: true, data });
  } else if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const data = await getAttendanceJournal(course.id);
  return Response.json({ ok: true, data });
}
