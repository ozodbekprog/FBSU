import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { QuestionBankManager } from "@/components/question-bank/manager";

export default async function QuestionBankPage() {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const courses = await prisma.course.findMany({
    where:
      user.role === "TEACHER"
        ? { OR: [{ teacherId: user.id }, { managerIds: { has: user.id } }] }
        : {},
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const subjects =
    user.role === "ADMIN"
      ? await prisma.subject.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : (
          await prisma.teacherSubject.findMany({
            where: { teacherId: user.id },
            orderBy: { subject: { name: "asc" } },
            select: { subject: { select: { id: true, name: true } } },
          })
        ).map((item) => item.subject);

  return (
    <>
      <PageHeader
        title={dictionary.grdQuestionBank}
        subtitle={dictionary.grdQuestionBankSubtitle}
      />
      <QuestionBankManager courses={courses} subjects={subjects} />
    </>
  );
}
