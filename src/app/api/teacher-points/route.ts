import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "STUDENT") {
    return Response.json({ ok: false, error: "Talaba bu sahifaga kirishga huquq yoq" }, { status: 403 });
  }

  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  const courseId = url.searchParams.get("courseId");

  if (!studentId) {
    return Response.json({ ok: false, error: "studentId talab qilinadi" }, { status: 400 });
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    const where = courseId ? { studentId, courseId } : { studentId };
    const data = await prisma.teacherPoint.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        student: { select: { id: true, name: true } },
        awardedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ ok: true, data });
  }

  // Teacher: only their own points
  const where = courseId
    ? { studentId, courseId, awardedById: user.id }
    : { studentId, awardedById: user.id };

  const data = await prisma.teacherPoint.findMany({
    where,
    include: {
      course: { select: { id: true, title: true } },
      student: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Faqat o'qituvchilar va admin berish mumkin" }, { status: 403 });
  }

  const body = await request.json();
  const { courseId, studentId, points, category, reason } = body;

  if (!courseId || !studentId || points === undefined || !category) {
    return Response.json({ ok: false, error: "Kerakli ma'lumotlar yo'q" }, { status: 400 });
  }

  if (points < 0.1 || points > 15) {
    return Response.json({ ok: false, error: "Ball 0.1 dan 15 gacha bo'lishi kerak" }, { status: 400 });
  }

  // Validate course belongs to this teacher (or admin)
  if (user.role !== "ADMIN") {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!course || course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Bu kursga siz huquq yoq" }, { status: 403 });
    }
  }

  // Validate student is enrolled in the course
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, userId: studentId, status: "ACTIVE" },
  });
  if (!enrollment) {
    return Response.json({ ok: false, error: "Talaba bu kursga ro'yxatdan o'tmagan" }, { status: 400 });
  }

  // Check if teacher already gave a point in this category for this course/student
  const existing = await prisma.teacherPoint.findFirst({
    where: { courseId, studentId, awardedById: user.id, category },
  });

  if (existing) {
    return Response.json({ ok: false, error: "Bu kategoriya uchun allaqachon ball berilgan" }, { status: 400 });
  }

  const point = await prisma.teacherPoint.create({
    data: {
      courseId,
      studentId,
      awardedById: user.id,
      points,
      category,
      reason: reason || "",
    },
  });

  return Response.json({ ok: true, data: point });
}
