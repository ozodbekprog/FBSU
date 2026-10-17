import { isStaff, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { JoinForm } from "@/components/secure-exam/join-form";
import { LogoutForm } from "@/components/auth/logout-form";
import { RUN_TONE, runStatusLabel } from "@/components/secure-exam/display";
import type { RunStatus } from "@/modules/secure-exam/types";
import { getDictionary, getLocale } from "@/i18n";

export default async function ExamHomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;

  const isProctor = user.role === "NAZORATCHI";

  if (isStaff(user.role) || isProctor) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            {dictionary.secModeChip}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-brand-950">
            {dictionary.secTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {isProctor ? dictionary.secNazoratSubtitle : dictionary.secSubtitleStaff}
          </p>
          {isProctor ? (
            <ButtonLink href="/nazorat" className="mt-5">
              {dictionary.navNazorat}
            </ButtonLink>
          ) : (
            <ButtonLink href="/secure-exams" className="mt-5">
              {dictionary.secStaffPanel}
            </ButtonLink>
          )}
        </Card>
      </div>
    );
  }

  const runs = await prisma.secureExamRun.findMany({
    where: { studentId: user.id },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      exam: { select: { id: true, title: true, quizId: true } },
      attempt: { select: { finishedAt: true, score: true } },
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <JoinForm initialCode={typeof params.code === "string" ? params.code.toUpperCase() : ""} />
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {dictionary.secMyRuns}
        </p>
        {runs.length === 0 ? (
          <EmptyState title={dictionary.secNoRuns} description={dictionary.secNoRunsDesc} />
        ) : (
          runs.map((run) => {
            const finished = run.attempt.finishedAt !== null;
            const status: RunStatus = finished
              ? run.status === "TERMINATED"
                ? "TERMINATED"
                : "SUBMITTED"
              : "ACTIVE";
            return (
              <Card key={run.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{run.exam.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={RUN_TONE[status]}>{runStatusLabel(status, dictionary)}</Badge>
                    <span className="text-xs text-slate-500">{fmtDateTime(run.startedAt)}</span>
                    {run.attempt.score !== null ? (
                      <span className="text-xs font-medium text-slate-600">
                        {dictionary.secScore}: {run.attempt.score}
                      </span>
                    ) : null}
                  </div>
                </div>
                {finished ? (
                  <ButtonLink
                    href={`/quizzes/${run.exam.quizId}/results`}
                    size="sm"
                    variant="secondary"
                  >
                    {dictionary.secResults}
                  </ButtonLink>
                ) : (
                  <ButtonLink href={`/exam/${run.id}`} size="sm">
                    {dictionary.secResume}
                  </ButtonLink>
                )}
              </Card>
            );
          })
        )}
      </div>
      <div className="max-w-xs">
        <LogoutForm />
      </div>
    </div>
  );
}
