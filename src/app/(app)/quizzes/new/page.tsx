import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { QuizEditor } from "@/components/quiz/quiz-editor";
import { getDictionary, getLocale } from "@/i18n";

export default async function NewQuizPage() {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const dictionary = getDictionary(await getLocale());
  const courses = await prisma.course.findMany({
    where: user.role === "TEACHER" ? { teacherId: user.id } : {},
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <>
      <PageHeader
        title={dictionary.crsQuizCreate}
        subtitle={dictionary.crsQuizMetaCreateSubtitle}
      />
      <QuizEditor courses={courses} />
    </>
  );
}
