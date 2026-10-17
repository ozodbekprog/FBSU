import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

type ExportedSection = { title: string; position: number };

type ExportedMaterial = {
  sectionIndex: number | null;
  title: string;
  type: string;
  content: string | null;
  fileUrl: string | null;
  position: number;
};

type ExportedAssignment = {
  sectionIndex: number | null;
  title: string;
  description: string | null;
  maxScore: number;
  dueAt: Date | null;
};

type ExportedQuiz = {
  title: string;
  description: string | null;
  timeLimitMin: number | null;
  maxAttempts: number;
  isPublished: boolean;
  dueAt: Date | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      sections: {
        orderBy: { position: "asc" },
        include: { materials: { orderBy: { position: "asc" } } },
      },
      assignments: { orderBy: { createdAt: "asc" } },
      quizzes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }

  if (!canManageCourse(user, course)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const sections: ExportedSection[] = course.sections.map((section) => ({
    title: section.title,
    position: section.position,
  }));

  const sectionIndexById = new Map<string, number>();
  course.sections.forEach((section, index) => sectionIndexById.set(section.id, index));

  const materials: ExportedMaterial[] = course.sections.flatMap((section) =>
    section.materials.map((material) => ({
      sectionIndex: sectionIndexById.get(material.sectionId) ?? null,
      title: material.title,
      type: material.type,
      content: material.content,
      fileUrl: material.fileUrl,
      position: material.position,
    })),
  );

  const assignments: ExportedAssignment[] = course.assignments.map((assignment) => ({
    sectionIndex: assignment.sectionId
      ? (sectionIndexById.get(assignment.sectionId) ?? null)
      : null,
    title: assignment.title,
    description: assignment.description,
    maxScore: assignment.maxScore,
    dueAt: assignment.dueAt,
  }));

  const quizzes: ExportedQuiz[] = course.quizzes.map((quiz) => ({
    title: quiz.title,
    description: quiz.description,
    timeLimitMin: quiz.timeLimitMin,
    maxAttempts: quiz.maxAttempts,
    isPublished: quiz.isPublished,
    dueAt: quiz.dueAt,
  }));

  const backup = {
    format: "fbsu-course",
    version: 1,
    exportedAt: new Date().toISOString(),
    meta: {
      sourceCourseId: course.id,
      sourceSlug: course.slug,
      questionsIncluded: false,
      note: "Test savollari (question bank) eksport qilinmaydi",
    },
    course: {
      title: course.title,
      description: course.description,
      coverColor: course.coverColor,
      isPublished: course.isPublished,
      isElective: course.isElective,
      selfEnrollment: course.selfEnrollment,
    },
    sections,
    materials,
    assignments,
    quizzes,
  };

  await recordEvent(user.id, "course.export", {
    entity: "Course",
    entityId: course.id,
    meta: { title: course.title },
  });

  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${course.slug}-backup.json"`,
    },
  });
}
