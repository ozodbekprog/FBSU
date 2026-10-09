import Link from "next/link";
import type { ReactNode } from "react";
import { isStaff, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { ScoreRing } from "@/components/quiz/score-ring";
import { getDictionary, getLocale, t as translate, type Locale } from "@/i18n";

function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-100">
      {children}
    </span>
  );
}

function QuestionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8v.5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default async function QuizzesPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (isStaff(user.role)) {
    const quizzes = await prisma.quiz.findMany({
      where: user.role === "TEACHER" ? { course: { teacherId: user.id } } : {},
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { title: true } },
        questions: { select: { points: true } },
        _count: { select: { attempts: true } },
        attempts: {
          where: { finishedAt: { not: null }, score: { not: null } },
          select: { score: true },
        },
      },
    });

    return (
      <>
        <PageHeader
          title={dictionary.grdQuizzes}
          subtitle={translate(locale, "grdQuizCount", { count: quizzes.length })}
          action={<ButtonLink href="/quizzes/new">{dictionary.crsQuizCreate}</ButtonLink>}
        />
        {quizzes.length === 0 ? (
          <EmptyState
            title={dictionary.grdNoAssessments}
            description={dictionary.grdNoAssessmentsDescStaff}
            action={<ButtonLink href="/quizzes/new">{dictionary.crsQuizCreate}</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz) => {
              const total = quiz.questions.reduce((sum, question) => sum + question.points, 0);
              const scores = quiz.attempts
                .map((attempt) => attempt.score)
                .filter((score): score is number => score != null);
              const average =
                scores.length > 0
                  ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                  : null;
              const best = scores.length > 0 ? Math.max(...scores) : null;
              return (
                <Card
                  key={quiz.id}
                  className="group relative flex h-full flex-col overflow-hidden p-5 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:border-brand-200 hover:shadow-lift"
                >
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Link
                    href={`/quizzes/${quiz.id}`}
                    aria-label={quiz.title}
                    className="absolute inset-0 rounded-2xl"
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tracking-tight text-slate-900">{quiz.title}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{quiz.course.title}</p>
                      <div className="mt-3">
                        <Badge tone={quiz.isPublished ? "green" : "slate"}>
                          {quiz.isPublished ? dictionary.grdExPublished : dictionary.grdExDraft}
                        </Badge>
                      </div>
                    </div>
                    <ScoreRing
                      score={average}
                      max={total}
                      size={88}
                      caption={dictionary.grdAverage}
                      hint={attemptsHint(quiz._count.attempts, best, total, locale)}
                      className="shrink-0"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <MetaChip>
                      <QuestionIcon />
                      {translate(locale, "grdQbQuestionCount", { count: quiz.questions.length })}
                    </MetaChip>
                    <MetaChip>
                      <ClockIcon />
                      {quiz.timeLimitMin
                        ? translate(locale, "grdExMinutes", { count: quiz.timeLimitMin })
                        : dictionary.grdExNoTimeLimit}
                    </MetaChip>
                    <MetaChip>
                      <RepeatIcon />
                      {translate(locale, "grdAttemptsCount", { count: quiz._count.attempts })}
                    </MetaChip>
                  </div>
                  <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <ButtonLink
                      href={`/quizzes/${quiz.id}/results`}
                      variant="secondary"
                      size="sm"
                    >
                      {dictionary.grdExResults}
                    </ButtonLink>
                    <ButtonLink
                      href={`/quizzes/${quiz.id}/edit`}
                      variant="secondary"
                      size="sm"
                    >
                      {dictionary.grdExEdit}
                    </ButtonLink>
                    <span className="ml-auto text-xs text-slate-600">
                      {translate(locale, "grdExMaxAttempts", { count: quiz.maxAttempts })}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { courseId: true },
  });
  const quizzes = await prisma.quiz.findMany({
    where: {
      isPublished: true,
      courseId: { in: enrollments.map((item) => item.courseId) },
    },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true } },
      questions: { select: { points: true } },
      attempts: {
        where: { studentId: user.id },
        orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true, finishedAt: true, score: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        title={dictionary.grdQuizzes}
        subtitle={translate(locale, "grdQuizCount", { count: quizzes.length })}
      />
      {quizzes.length === 0 ? (
        <EmptyState
          title={dictionary.grdNoAssessments}
          description={dictionary.grdNoAssessmentsStudentDesc}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => {
            const total = quiz.questions.reduce((sum, question) => sum + question.points, 0);
            const active = quiz.attempts.find((attempt) => attempt.finishedAt === null);
            const finished = quiz.attempts.filter((attempt) => attempt.finishedAt !== null);
            const scores = finished
              .map((attempt) => attempt.score)
              .filter((score): score is number => score != null);
            const best = scores.length > 0 ? Math.max(...scores) : null;
            const lastScore = finished.find((attempt) => attempt.score != null)?.score ?? null;
            const exhausted = finished.length >= quiz.maxAttempts;
            const status = active
              ? { tone: "amber" as const, label: dictionary.grdExInProgress }
              : exhausted
                ? { tone: "amber" as const, label: dictionary.grdCompleted }
                : lastScore != null
                  ? { tone: "green" as const, label: `${dictionary.grdScoreLabelColon} ${lastScore}` }
                  : { tone: "brand" as const, label: dictionary.mscOrderStatusNew };
            return (
              <Link key={quiz.id} href={`/quizzes/${quiz.id}`} className="block h-full">
                <Card className="group relative flex h-full flex-col overflow-hidden p-5 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:border-brand-200 hover:shadow-lift">
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold tracking-tight text-slate-900">{quiz.title}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{quiz.course.title}</p>
                      <div className="mt-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                    </div>
                    <ScoreRing
                      score={best}
                      max={total}
                      size={88}
                      caption={dictionary.grdResult}
                      hint={
                        finished.length > 0
                          ? translate(locale, "grdAttemptsCount", {
                              count: `${finished.length}/${quiz.maxAttempts}`,
                            })
                          : dictionary.crsNotSubmittedYet
                      }
                      className="shrink-0"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <MetaChip>
                      <QuestionIcon />
                      {translate(locale, "grdQbQuestionCount", { count: quiz.questions.length })}
                    </MetaChip>
                    <MetaChip>
                      <ClockIcon />
                      {quiz.timeLimitMin
                        ? translate(locale, "grdExMinutes", { count: quiz.timeLimitMin })
                        : dictionary.grdExNoTimeLimit}
                    </MetaChip>
                    <MetaChip>
                      <ListIcon />
                      {quiz.questions.length > 0
                        ? translate(locale, "crsQuizPoints", { points: total })
                        : dictionary.crsQuizNoScore}
                    </MetaChip>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-500">
                      {active
                        ? dictionary.grdExInProgress
                        : exhausted
                          ? dictionary.grdExResults
                          : dictionary.crsQuizStart}
                    </span>
                    <span className="text-xs font-medium text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5">
                      {dictionary.crsOpen} &rarr;
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function attemptsHint(count: number, best: number | null, total: number, locale: Locale): string {
  if (count === 0) return translate(locale, "crsNotSubmittedYet");
  if (best == null) return translate(locale, "grdAttemptsCount", { count });
  return translate(locale, "crsQuizPoints", { points: `${best}/${total}` });
}
