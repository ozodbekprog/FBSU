import Link from "next/link";
import { Badge, ButtonLink, Card, Progress } from "@/components/ui";
import { cn, fmtDate } from "@/lib/utils";
import { getDictionary, getLocale, t as translate, type Locale } from "@/i18n";
import { MONTH_KEYS } from "@/components/schedule/week-utils";
import { examBucket, EXAM_MIN_PERCENT, type ExamBucket, type StaffExamItem, type StudentExamItem } from "./data";

const BUCKET_BADGES: Record<ExamBucket, { key: "grdGroupUpcoming" | "grdGroupToday" | "grdGroupPast"; tone: "blue" | "amber" | "slate" }> = {
  upcoming: { key: "grdGroupUpcoming", tone: "blue" },
  today: { key: "grdGroupToday", tone: "amber" },
  past: { key: "grdGroupPast", tone: "slate" },
};

const DATE_TONES: Record<ExamBucket, string> = {
  upcoming: "bg-brand-50 text-brand-700 ring-brand-100",
  today: "bg-amber-50 text-amber-700 ring-amber-100",
  past: "bg-slate-100 text-slate-500 ring-slate-200",
};

const MINI_TONES = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
} as const;

function fmtTime(value: Date) {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function DateTile({ date, bucket, month }: { date: Date; bucket: ExamBucket; month: string }) {
  return (
    <div
      title={fmtDate(date)}
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl ring-1",
        DATE_TONES[bucket],
      )}
    >
      <span className="text-lg font-bold leading-none">{date.getDate()}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">
        {month}
      </span>
    </div>
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

function ExamMeta({ exam, locale }: { exam: { dueAt: Date; timeLimitMin: number | null }; locale: Locale }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600">
        <ClockIcon />
        {fmtTime(exam.dueAt)}
      </span>
      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600">
        {exam.timeLimitMin ? translate(locale, "grdExMinutes", { count: exam.timeLimitMin }) : translate(locale, "grdExNoTimeLimit")}
      </span>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: keyof typeof MINI_TONES }) {
  return (
    <div className={cn("rounded-xl px-3 py-2.5", MINI_TONES[tone])}>
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function StudentState({ exam, locale }: { exam: StudentExamItem; locale: Locale }) {
  const bucket = examBucket(exam.dueAt);
  if (exam.attempts.active) return <Badge tone="amber">{translate(locale, "grdExInProgress")}</Badge>;
  if (exam.attempts.finished > 0) {
    return (
      <Badge tone="green">
        {exam.attempts.lastScore != null
          ? translate(locale, "grdExSubmittedScore", { score: exam.attempts.lastScore })
          : translate(locale, "grdSubmitted")}
      </Badge>
    );
  }
  return <Badge tone={bucket === "past" ? "rose" : "slate"}>{translate(locale, "grdExNotSubmitted")}</Badge>;
}

function EligibilityBanner({ exam, locale }: { exam: StudentExamItem; locale: Locale }) {
  const eligible = exam.attendance.eligible;
  return (
    <div
      className={cn(
        "mt-4 flex items-center gap-3 rounded-xl border px-3.5 py-3",
        eligible ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          eligible ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600",
        )}
      >
        {eligible ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className={cn("text-sm font-bold", eligible ? "text-emerald-700" : "text-rose-700")}>
          {translate(locale, eligible ? "grdExamAdmitted" : "grdNoPermission")}
        </p>
        <p className={cn("mt-0.5 text-xs", eligible ? "text-emerald-600/80" : "text-rose-600/80")}>
          {eligible
            ? translate(locale, "grdExAttendanceMet", { percent: exam.attendance.percent })
            : translate(locale, "grdExAttendanceRequired", { percent: exam.attendance.percent, min: EXAM_MIN_PERCENT })}
        </p>
      </div>
    </div>
  );
}

export async function StudentExamCard({ exam }: { exam: StudentExamItem }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const bucket = examBucket(exam.dueAt);
  return (
    <Link href={`/quizzes/${exam.id}`} className="block h-full">
      <Card className="group flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
        <div className="flex items-start gap-3">
          <DateTile date={exam.dueAt} bucket={bucket} month={dictionary[MONTH_KEYS[exam.dueAt.getMonth()]].slice(0, 3)} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight text-slate-900">{exam.title}</p>
            <p className="mt-0.5 truncate text-sm text-slate-500">{exam.course.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={BUCKET_BADGES[bucket].tone}>{translate(locale, BUCKET_BADGES[bucket].key)}</Badge>
              <StudentState exam={exam} locale={locale} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ExamMeta exam={exam} locale={locale} />
        </div>
        {exam.attendance.eligible ? null : <EligibilityBanner exam={exam} locale={locale} />}
        <div className="mb-4 mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{dictionary.grdExAttempts}</span>
            <span className="font-semibold text-slate-700">
              {exam.attempts.finished}/{exam.maxAttempts}
            </span>
          </div>
          <Progress value={exam.attempts.finished} max={Math.max(1, exam.maxAttempts)} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-500">
            {exam.attempts.lastScore != null
              ? translate(locale, "grdExLastResult", { score: exam.attempts.lastScore })
              : translate(locale, "grdExMaxAttempts", { count: exam.maxAttempts })}
          </span>
          <span className="shrink-0 text-xs font-semibold text-brand-700 transition-colors group-hover:text-brand-900">
            {dictionary.grdExOpenTest} &rarr;
          </span>
        </div>
      </Card>
    </Link>
  );
}

export async function StaffExamCard({ exam }: { exam: StaffExamItem }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const bucket = examBucket(exam.dueAt);
  const submitRate = exam.attemptCount > 0 ? Math.round((exam.submittedCount / exam.attemptCount) * 100) : 0;
  return (
    <Card className="relative flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={`/quizzes/${exam.id}`} aria-label={exam.title} className="absolute inset-0 rounded-2xl" />
      <div className="flex items-start gap-3">
        <DateTile date={exam.dueAt} bucket={bucket} month={dictionary[MONTH_KEYS[exam.dueAt.getMonth()]].slice(0, 3)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight text-slate-900">{exam.title}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">
            {exam.course.title} · {exam.course.teacherName}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={BUCKET_BADGES[bucket].tone}>{translate(locale, BUCKET_BADGES[bucket].key)}</Badge>
            <Badge tone={exam.isPublished ? "green" : "slate"}>
              {exam.isPublished ? dictionary.grdExPublished : dictionary.grdExDraft}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <ExamMeta exam={exam} locale={locale} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label={dictionary.grdExQuestions} value={exam.questionCount} tone="brand" />
        <MiniStat label={dictionary.grdExSubmitters} value={exam.submittedCount} tone="emerald" />
        <MiniStat label={dictionary.grdExAttemptsShort} value={exam.attemptCount} tone="amber" />
      </div>
      <div className="mb-4 mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{dictionary.grdExSubmitRate}</span>
          <span className="font-semibold text-slate-700">{submitRate}%</span>
        </div>
        <Progress value={exam.submittedCount} max={Math.max(1, exam.attemptCount)} />
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
        <ButtonLink
          href={`/quizzes/${exam.id}/results`}
          variant="secondary"
          size="sm"
          className="relative z-10"
        >
          {dictionary.grdExResults}
        </ButtonLink>
        <ButtonLink
          href={`/quizzes/${exam.id}/edit`}
          variant="secondary"
          size="sm"
          className="relative z-10"
        >
          {dictionary.grdExEdit}
        </ButtonLink>
        <span className="ml-auto text-xs text-slate-600">{translate(locale, "grdExMax", { count: exam.maxAttempts })}</span>
      </div>
    </Card>
  );
}
