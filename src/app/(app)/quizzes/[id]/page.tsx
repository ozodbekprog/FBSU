import { notFound } from "next/navigation";
import { isStaff, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, fmtDateTime } from "@/lib/utils";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader, Progress, Stat } from "@/components/ui";
import { StartAttemptButton } from "@/components/quiz/start-button";
import { ScoreRing } from "@/components/quiz/score-ring";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import {
  QUESTION_TYPE_ACCENT,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPE_SOFT,
  QUESTION_TYPE_TONE,
  toQuestionFull,
  totalPoints,
} from "@/components/quiz/shared";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, teacherId: true } },
      questions: { orderBy: { position: "asc" } },
    },
  });
  if (!quiz) notFound();

  const staff = isStaff(user.role);
  const questions = quiz.questions.map(toQuestionFull);

  if (staff) {
    if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) notFound();
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: id },
      orderBy: { startedAt: "desc" },
      include: { student: { select: { name: true } } },
      take: 5,
    });
    return (
      <>
        <PageHeader
          title={quiz.title}
          subtitle={quiz.course.title}
          action={
            <div className="flex gap-2">
              <ButtonLink href={`/quizzes/${quiz.id}/results`} variant="secondary">
                {dictionary.grdExResults}
              </ButtonLink>
              <ButtonLink href={`/quizzes/${quiz.id}/edit`}>{dictionary.grdExEdit}</ButtonLink>
            </div>
          }
        />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={dictionary.grdExQuestions} value={questions.length} />
          <Stat label={dictionary.grdScore} value={totalPoints(questions)} />
          <Stat
            label={dictionary.crsQuizTimeLimit}
            value={
              quiz.timeLimitMin
                ? translate(locale, "grdExMinutes", { count: quiz.timeLimitMin })
                : dictionary.grdExNoTimeLimit
            }
          />
          <Stat
            label={dictionary.grdExAttempts}
            value={attempts.length}
            hint={translate(locale, "grdExMax", { count: quiz.maxAttempts })}
          />
        </div>
        <div className="mb-6 flex items-center gap-2">
          <Badge tone={quiz.isPublished ? "green" : "amber"}>
            {quiz.isPublished ? dictionary.grdExPublished : dictionary.grdExDraft}
          </Badge>
          {quiz.description ? <p className="text-sm text-slate-500">{quiz.description}</p> : null}
        </div>

        <h2 className="mb-3 text-lg font-semibold text-slate-900">{dictionary.grdExQuestions}</h2>
        <div className="space-y-3">
          {questions.length === 0 ? <EmptyState title={dictionary.crsQuizNoQuestions} /> : null}
          {questions.map((question) => (
            <Card key={question.id} className="relative overflow-hidden">
              <span className={cn("absolute inset-y-0 left-0 w-1", QUESTION_TYPE_ACCENT[question.type])} />
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-lg text-xs font-bold",
                        QUESTION_TYPE_SOFT[question.type],
                      )}
                    >
                      {question.position}
                    </span>
                    <span>{question.text}</span>
                    <Badge tone={QUESTION_TYPE_TONE[question.type]}>
                      {QUESTION_TYPE_LABEL[question.type]}
                    </Badge>
                    <Badge tone="gold">{translate(locale, "crsQuizPoints", { points: question.points })}</Badge>
                  </span>
                }
              />
              <CardBody className="pl-7">
                {question.type === "TEXT" ? (
                  <p className="text-sm text-slate-500">
                    {dictionary.crsQuizTextManual}
                  </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, index) => {
                      const isCorrect = question.correct.includes(index);
                      return (
                        <li
                          key={index}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm",
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50/80 font-medium text-emerald-900 ring-2 ring-emerald-400/30"
                              : "border-slate-200 bg-white text-slate-600",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                              isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {isCorrect ? (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ) : (
                              String.fromCharCode(65 + index)
                            )}
                          </span>
                          <span className="truncate">{option}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>

        {attempts.length > 0 ? (
          <Card className="mt-6">
            <CardHeader title={dictionary.grdExAttempts} />
            <CardBody className="space-y-2">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">{attempt.student.name}</span>
                  <span className="text-xs text-slate-500">{fmtDateTime(attempt.startedAt)}</span>
                  {attempt.finishedAt ? (
                    <Badge tone={attempt.score != null ? "green" : "amber"}>
                      {attempt.score != null
                        ? `${dictionary.grdScoreLabelColon} ${attempt.score}`
                        : dictionary.grdGradeNone}
                    </Badge>
                  ) : (
                    <Badge tone="blue">{dictionary.grdExInProgress}</Badge>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}
      </>
    );
  }

  if (!quiz.isPublished) notFound();
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: quiz.courseId, userId: user.id }, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) notFound();

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: id, studentId: user.id },
    orderBy: { startedAt: "desc" },
  });
  const active = attempts.find((attempt) => attempt.finishedAt === null);
  const finished = attempts.filter((attempt) => attempt.finishedAt !== null);
  const canStart = !active && finished.length < quiz.maxAttempts;
  const scoredCount = finished.filter((attempt) => attempt.score != null).length;
  const bestScore =
    scoredCount > 0
      ? Math.max(...finished.map((attempt) => attempt.score ?? 0))
      : null;
  const maxPoints = totalPoints(questions);

  return (
    <>
      <PageHeader title={quiz.title} subtitle={quiz.course.title} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={dictionary.grdExQuestions} value={questions.length} />
        <Stat label={dictionary.grdScore} value={totalPoints(questions)} />
        <Stat
          label={dictionary.crsQuizTimeLimit}
          value={
            quiz.timeLimitMin
              ? translate(locale, "grdExMinutes", { count: quiz.timeLimitMin })
              : dictionary.grdExNoTimeLimit
          }
        />
        <Stat
          label={dictionary.grdExAttempts}
          value={`${finished.length}/${quiz.maxAttempts}`}
        />
      </div>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm font-semibold text-slate-800">{dictionary.crsQuizMetaTitle}</p>
            {quiz.description ? (
              <p className="text-sm text-slate-600">{quiz.description}</p>
            ) : (
              <p className="text-sm text-slate-500">{dictionary.crsNoDescription}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {active ? (
                <ButtonLink href={`/quizzes/${quiz.id}/attempt?attemptId=${active.id}`}>
                  {dictionary.grdExInProgress}
                </ButtonLink>
              ) : canStart ? (
                <StartAttemptButton quizId={quiz.id} />
              ) : (
                <Badge tone="slate">{dictionary.grdCompleted}</Badge>
              )}
              <ButtonLink href={`/quizzes/${quiz.id}/results`} variant="secondary">
                {dictionary.grdExResults}
              </ButtonLink>
            </div>
          </div>
          <ScoreRing
            score={bestScore}
            max={maxPoints}
            size={116}
            strokeWidth={9}
            caption={dictionary.grdResult}
            hint={translate(locale, "grdAttemptsCount", {
              count: `${finished.length}/${quiz.maxAttempts}`,
            })}
            className="shrink-0"
          />
        </CardBody>
      </Card>

      {finished.length > 0 ? (
        <Card>
          <CardHeader title={dictionary.grdQuizAttempts} />
          <CardBody className="space-y-2">
            {finished.map((attempt, index) => {
              const isBest = attempt.score != null && attempt.score === bestScore;
              return (
                <div
                  key={attempt.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm transition-colors duration-150 hover:border-slate-200 hover:bg-slate-50/60"
                >
                  <span className="inline-flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                    {finished.length - index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-700">{fmtDateTime(attempt.startedAt)}</p>
                    <p className="text-xs text-slate-600">
                      {translate(locale, "crsSubmittedAt", { date: fmtDateTime(attempt.finishedAt) })}
                    </p>
                  </div>
                  {attempt.score != null ? (
                    <Progress value={attempt.score} max={maxPoints} className="hidden w-24 sm:block" />
                  ) : null}
                  <Badge tone={attempt.score != null ? "green" : "amber"}>
                    {attempt.score != null
                      ? `${dictionary.grdScoreLabelColon} ${attempt.score}`
                      : dictionary.grdGradeNone}
                  </Badge>
                  {isBest ? <Badge tone="gold">{dictionary.grdGpaStatusExcellent}</Badge> : null}
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : (
        <EmptyState title={dictionary.crsNotSubmittedYet} description={dictionary.dashGradeTrendEmpty} />
      )}
    </>
  );
}
