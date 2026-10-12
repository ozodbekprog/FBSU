import Link from "next/link";
import { isStaff, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { CreateForm } from "@/components/secure-exam/create-form";
import { JoinForm } from "@/components/secure-exam/join-form";
import { formatExamCode } from "@/modules/secure-exam/code";
import type { ExamStatus, RunStatus } from "@/modules/secure-exam/types";
import { getDictionary, getLocale } from "@/i18n";
import type { Dictionary } from "@/i18n/uz";

const EXAM_TONE: Record<ExamStatus, "blue" | "green" | "slate"> = {
  SCHEDULED: "blue",
  ACTIVE: "green",
  CLOSED: "slate",
};

const RUN_TONE: Record<RunStatus, "green" | "blue" | "rose"> = {
  ACTIVE: "green",
  SUBMITTED: "blue",
  TERMINATED: "rose",
};

function examStatusLabel(status: ExamStatus, dictionary: Dictionary): string {
  if (status === "SCHEDULED") return dictionary.secStatusScheduled;
  if (status === "ACTIVE") return dictionary.secStatusActive;
  return dictionary.secStatusClosed;
}

function runStatusLabel(status: RunStatus, dictionary: Dictionary): string {
  if (status === "ACTIVE") return dictionary.secRunActive;
  if (status === "SUBMITTED") return dictionary.secRunSubmitted;
  return dictionary.secRunTerminated;
}

export default async function SecureExamsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (isStaff(user.role)) {
    const [exams, quizzes] = await Promise.all([
      prisma.secureExam.findMany({
        where:
          user.role === "TEACHER"
            ? { OR: [{ createdById: user.id }, { course: { teacherId: user.id } }] }
            : {},
        orderBy: { createdAt: "desc" },
        include: {
          quiz: { select: { title: true } },
          course: { select: { title: true } },
          _count: { select: { runs: true } },
        },
      }),
      prisma.quiz.findMany({
        where: {
          isPublished: true,
          ...(user.role === "TEACHER" ? { course: { teacherId: user.id } } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { course: { select: { title: true } } },
      }),
    ]);

    return (
      <>
        <PageHeader title={dictionary.secTitle} subtitle={dictionary.secSubtitleStaff} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-3">
            {exams.length === 0 ? (
              <EmptyState title={dictionary.secNoExams} description={dictionary.secNoExamsDesc} />
            ) : (
              exams.map((exam) => (
                <Card
                  key={exam.id}
                  className="group relative overflow-hidden p-5 transition-[border-color,box-shadow] duration-200 hover:border-brand-200 hover:shadow-lift"
                >
                  <Link
                    href={`/secure-exams/${exam.id}`}
                    aria-label={exam.title}
                    className="absolute inset-0 rounded-2xl"
                  />
                  <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold tracking-tight text-slate-900">
                        {exam.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {exam.quiz.title} · {exam.course.title}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Badge tone={EXAM_TONE[exam.status]}>
                          {examStatusLabel(exam.status, dictionary)}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {fmtDateTime(exam.startsAt)} — {fmtDateTime(exam.endsAt)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {dictionary.secParticipants.replace("{count}", String(exam._count.runs))}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold tracking-[0.2em] text-brand-950">
                        {formatExamCode(exam.code)}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 group-hover:underline">
                        {dictionary.secMonitor}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
          <div className="space-y-3 lg:sticky lg:top-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              {dictionary.secCreate}
            </p>
            <CreateForm
              quizzes={quizzes.map((quiz) => ({
                id: quiz.id,
                title: quiz.title,
                courseTitle: quiz.course.title,
                timeLimitMin: quiz.timeLimitMin,
              }))}
            />
          </div>
        </div>
      </>
    );
  }

  const runs = await prisma.secureExamRun.findMany({
    where: { studentId: user.id },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      exam: { select: { id: true, title: true, quizId: true } },
      attempt: { select: { finishedAt: true, score: true } },
    },
  });

  return (
    <>
      <PageHeader title={dictionary.secTitle} subtitle={dictionary.secSubtitleStudent} />
      <div className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <JoinForm />
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
      </div>
    </>
  );
}
