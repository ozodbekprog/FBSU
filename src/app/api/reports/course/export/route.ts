import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/modules/capabilities";
import { buildCourseActivityReport, courseActivityCsv } from "@/components/reports/course-report";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return Response.json({ ok: false, error: "courseId kerak" }, { status: 400 });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, slug: true, teacherId: true },
  });
  if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });

  if (!hasCapability(user.role, "analysis.view") && course.teacherId !== user.id) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const report = await buildCourseActivityReport({
    id: course.id,
    title: course.title,
    slug: course.slug,
  });
  const csv = `\uFEFF${courseActivityCsv(report)}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kurs-faolligi-${course.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
