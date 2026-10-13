import { redirect } from "next/navigation";
import { isStaff, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { JoinForm } from "@/components/secure-exam/join-form";
import { isValidExamCode, normalizeExamCode } from "@/modules/secure-exam/code";
import { getDictionary, getLocale } from "@/i18n";

export default async function ExamLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await requireUser();
  if (isStaff(user.role)) redirect("/secure-exams");
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const { code: raw } = await params;
  const code = normalizeExamCode(raw);

  const exam = isValidExamCode(code)
    ? await prisma.secureExam.findUnique({
        where: { code },
        select: {
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
        },
      })
    : null;

  const now = new Date();
  const open =
    exam !== null &&
    exam.status !== "CLOSED" &&
    now.getTime() <= exam.endsAt.getTime();

  if (!open) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader
          title={dictionary.secTitle}
          subtitle={dictionary.secSubtitleStudent}
          action={
            <ButtonLink href="/secure-exams" variant="secondary" size="sm">
              {dictionary.secBackToList}
            </ButtonLink>
          }
        />
        <Card className="p-6 text-center">
          <p className="font-medium text-slate-800">
            {exam ? dictionary.secLinkClosed : dictionary.secLinkNotFound}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={dictionary.secTitle} subtitle={dictionary.secSubtitleStudent} />
      <JoinForm initialCode={code} />
    </div>
  );
}
