import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, PageHeader } from "@/components/ui";
import { QuizEditor } from "@/components/quiz/quiz-editor";
import { toQuestionFull } from "@/components/quiz/shared";
import { getDictionary, getLocale } from "@/i18n";
import { canManageCourse } from "@/components/courses/course-access";

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const dictionary = getDictionary(await getLocale());
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { teacherId: true, teacherIds: true, managerIds: true, assistantIds: true } },
      questions: { orderBy: { position: "asc" } },
    },
  });
  if (!quiz) notFound();
  if (!canManageCourse(user, quiz.course)) notFound();

  const courses = await prisma.course.findMany({
    where:
      user.role === "TEACHER"
        ? { OR: [{ teacherId: user.id }, { managerIds: { has: user.id } }] }
        : {},
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <>
      <PageHeader
        title={dictionary.grdExEdit}
        subtitle={quiz.title}
        action={
          <ButtonLink href={`/quizzes/${quiz.id}`} variant="secondary">
            {dictionary.grdView}
          </ButtonLink>
        }
      />
      <QuizEditor
        courses={courses}
        quiz={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          courseId: quiz.courseId,
          timeLimitMin: quiz.timeLimitMin,
          maxAttempts: quiz.maxAttempts,
          isPublished: quiz.isPublished,
          questions: quiz.questions.map(toQuestionFull),
        }}
      />
    </>
  );
}
