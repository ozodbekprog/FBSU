import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, PageHeader } from "@/components/ui";
import { ExamMonitor } from "@/components/secure-exam/monitor";
import { getDictionary, getLocale } from "@/i18n";

export default async function SecureExamMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "TEACHER" && user.role !== "ADMIN") redirect("/secure-exams");
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { id } = await params;

  const exam = await prisma.secureExam.findUnique({ where: { id }, select: { id: true } });
  if (!exam) notFound();

  return (
    <>
      <PageHeader
        title={dictionary.secMonitorTitle}
        subtitle={dictionary.secMonitorSubtitle}
        action={
          <ButtonLink href="/secure-exams" variant="secondary" size="sm">
            {dictionary.secBackToList}
          </ButtonLink>
        }
      />
      <ExamMonitor examId={id} />
    </>
  );
}
