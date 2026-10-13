import { redirect } from "next/navigation";
import { isStaff, requireUser } from "@/lib/auth";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { StartExamButton } from "@/components/secure-exam/start-exam";
import { inspectSecureJoin } from "@/server/secure-exam";
import { normalizeExamCode } from "@/modules/secure-exam/code";
import { getDictionary, getLocale, t as translate } from "@/i18n";

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

  const inspection = await inspectSecureJoin({ id: user.id, role: user.role }, code);

  if (inspection.kind === "RESUME") redirect(`/exam/${inspection.runId}`);

  if (inspection.kind === "ERROR") {
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
          <p className="font-medium text-slate-800">{inspection.message}</p>
          {inspection.quizId ? (
            <ButtonLink
              href={`/quizzes/${inspection.quizId}/results`}
              size="sm"
              variant="secondary"
              className="mt-4"
            >
              {dictionary.secResultsLink}
            </ButtonLink>
          ) : null}
        </Card>
      </div>
    );
  }

  const { exam } = inspection;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={dictionary.secTitle} subtitle={dictionary.secSubtitleStudent} />
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          {dictionary.secYourExam}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-brand-950">{exam.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{exam.quizTitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {exam.durationMin !== null ? (
            <Badge tone="blue">{translate(locale, "secMinutes", { count: exam.durationMin })}</Badge>
          ) : null}
          <Badge tone="amber">
            {translate(locale, "secWarningLimit", { max: exam.maxWarnings })}
          </Badge>
          {exam.requireFullscreen ? (
            <Badge tone="slate">{dictionary.secFieldFullscreen}</Badge>
          ) : null}
          {exam.blockCopy ? <Badge tone="slate">{dictionary.secFieldBlockCopy}</Badge> : null}
          {exam.webcamEnabled ? (
            <Badge tone="rose">{dictionary.secGateCameraTitle}</Badge>
          ) : null}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{dictionary.secGateText}</p>
        <p className="mt-3 text-xs text-slate-500">
          {dictionary.secAccount}: {user.email}
        </p>
        <div className="mt-5">
          <StartExamButton code={code} />
        </div>
      </Card>
    </div>
  );
}
