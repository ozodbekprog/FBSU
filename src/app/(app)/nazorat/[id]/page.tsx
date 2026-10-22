import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, PageHeader } from "@/components/ui";
import { ExamMonitor } from "@/components/secure-exam/monitor";
import { getDictionary, getLocale } from "@/i18n";

export default async function NazoratExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "NAZORATCHI"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { id } = await params;

  const exam = await prisma.secureExam.findUnique({ where: { id }, select: { id: true } });
  if (!exam) notFound();

  return (
    <>
      <PageHeader
        title={dictionary.secNazoratTitle}
        subtitle={dictionary.secMonitorSubtitle}
        action={
          <ButtonLink href="/nazorat" variant="secondary" size="sm">
            {dictionary.secBackToList}
          </ButtonLink>
        }
      />
      <ExamMonitor examId={id} readOnly />
    </>
  );
}
