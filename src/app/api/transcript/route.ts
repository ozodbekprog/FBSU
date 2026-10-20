import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTranscript } from "@/components/transcript/transcript-data";
import { hasCapability } from "@/modules/capabilities";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const requestedId = new URL(request.url).searchParams.get("studentId")?.trim() || null;

  if (user.role === "STUDENT") {
    if (requestedId && requestedId !== user.id) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const data = await buildTranscript(user.id);
    if (!data) {
      return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 404 });
    }
    return Response.json({ ok: true, data });
  }

  if (!requestedId) {
    return Response.json({ ok: false, error: "studentId parametri kerak" }, { status: 400 });
  }

  if (!hasCapability(user.role, "transcript.view")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const student = await prisma.user.findUnique({
    where: { id: requestedId },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    const data = await buildTranscript(requestedId);
    if (!data) {
      return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 404 });
    }
    return Response.json({ ok: true, data });
  }

  const ownedCourses = await prisma.course.findMany({
    where: {
      OR: [{ teacherId: user.id }, { teacherIds: { has: user.id } }],
      enrollments: { some: { userId: requestedId } },
    },
    select: { id: true },
  });
  if (ownedCourses.length === 0) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const data = await buildTranscript(
    requestedId,
    ownedCourses.map((course) => course.id),
  );
  if (!data) {
    return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 404 });
  }

  return Response.json({ ok: true, data });
}
