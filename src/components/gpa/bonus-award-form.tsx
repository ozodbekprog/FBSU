"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type BonusCourse = { id: string; title: string };
export type BonusStudent = { id: string; name: string; groupName: string | null };

type Props = {
  courses: BonusCourse[];
  students: BonusStudent[];
  minTenths?: number;
  maxTenths?: number;
  /** Rektor rejimi: ball fanga bog'lanmaydi, talaba uni o'zi ishlatadi. */
  rectorMode?: boolean;
};

/** O'qituvchi 1..4 butun ball, rektor chegarasiz — API ga ×10 yuboriladi. */
const TENTHS_MIN = 10;
const TENTHS_MAX = 40;

const RECTOR_QUICK_POINTS = [1, 3, 5, 10, 20, 50];
const TEACHER_POINTS = [1, 2, 3, 4];

export function BonusAwardForm({
  courses,
  students,
  minTenths = TENTHS_MIN,
  maxTenths = TENTHS_MAX,
  rectorMode,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [studentQuery, setStudentQuery] = useState("");
  const [teacherPoints, setTeacherPoints] = useState(Math.max(1, Math.round(minTenths / 10)));
  const [rectorAmount, setRectorAmount] = useState(String(Math.max(1, Math.round(minTenths / 10))));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const isRectorMode = Boolean(rectorMode);

  const rectorPoints = useMemo(() => {
    const parsed = Number.parseInt(rectorAmount, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [rectorAmount]);

  const effectivePoints = isRectorMode ? rectorPoints : teacherPoints;
  const effectiveTenths = effectivePoints * 10;

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        (student.groupName ?? "").toLowerCase().includes(query),
    );
  }, [students, studentQuery]);

  const effectiveStudentId = filteredStudents.some((student) => student.id === studentId)
    ? studentId
    : (filteredStudents[0]?.id ?? "");

  const effectiveCourseId = courses.some((course) => course.id === courseId)
    ? courseId
    : (courses[0]?.id ?? "");

  const disabled =
    !effectiveStudentId ||
    (!isRectorMode && !effectiveCourseId) ||
    effectiveTenths < minTenths ||
    (maxTenths != null && !isRectorMode && effectiveTenths > maxTenths) ||
    reason.trim().length < 3 ||
    pending;

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === effectiveStudentId) ?? null,
    [students, effectiveStudentId],
  );

  const teacherScaleMax = Math.max(1, Math.round((maxTenths ?? TENTHS_MAX) / 10));
  const quickPoints = isRectorMode
    ? RECTOR_QUICK_POINTS
    : TEACHER_POINTS.filter((value) => value * 10 >= minTenths && value <= teacherScaleMax);

  function stepRector(direction: number) {
    const next = Math.max(1, (rectorPoints || 1) + direction);
    setRectorAmount(String(next));
    setMessage(null);
  }

  async function submit() {
    if (disabled) return;
    setMessage(null);
    try {
      const response = await fetch("/api/bonus-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isRectorMode ? {} : { courseId: effectiveCourseId }),
          studentId: effectiveStudentId,
          tenths: effectiveTenths,
          reason: reason.trim(),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; data?: unknown };

      if (!payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? t("grdErrorOccurred") });
        return;
      }

      setMessage({
        tone: "ok",
        text: t(isRectorMode ? "grdRectorBonusAwarded" : "grdBonusAwarded", {
          name: selectedStudent?.name ?? t("grdPupil"),
          points: effectivePoints,
        }),
      });
      setReason("");
      if (isRectorMode) {
        setRectorAmount("1");
      } else {
        setTeacherPoints(Math.max(1, Math.round(minTenths / 10)));
      }
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: t("grdServerError") });
    }
  }

  const cardTitle = isRectorMode ? t("grdRectorBonusTitle") : t("grdGiveBonus");
  const cardSubtitle = isRectorMode
    ? t("grdRectorBonusSubtitle", { points: effectivePoints })
    : t("grdBonusSubtitle", { points: effectivePoints });

  if (!isRectorMode && courses.length === 0) {
    return (
      <Card className="overflow-hidden">
        <FormHeader title={cardTitle} subtitle={cardSubtitle} />
        <CardBody className="px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center py-5 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <BookIcon />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-800">{t("grdNoSubjectAssigned")}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
              {t("grdNoSubjectAssignedDesc")}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const studentField = (
    <div className="grid gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{t("grdPupil")}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 ring-1 ring-slate-200">
          {filteredStudents.length} / {students.length}
        </span>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
        <Input
          value={studentQuery}
          onChange={(e) => setStudentQuery(e.target.value)}
          placeholder={t("grdBonusSearchStudent")}
          aria-label={t("grdBonusSearchStudent")}
          className="bg-white pl-9"
        />
      </div>
      {filteredStudents.length > 0 ? (
        <Select
          value={effectiveStudentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label={t("grdPupil")}
          className="bg-white"
        >
          {filteredStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
              {student.groupName ? ` — ${student.groupName}` : ""}
            </option>
          ))}
        </Select>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-center">
          <p className="text-xs font-medium text-slate-700">{t("grdBonusNoStudentFound")}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{t("grdBonusNoStudentsDesc")}</p>
        </div>
      )}
    </div>
  );

  const courseField = !isRectorMode ? (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{t("grdSubject")}</span>
      <Select value={effectiveCourseId} onChange={(e) => setCourseId(e.target.value)}>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </Select>
    </label>
  ) : null;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        isRectorMode &&
          "border-brand-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_50px_-30px_rgba(29,52,96,0.45)]",
      )}
    >
      <FormHeader
        title={cardTitle}
        subtitle={cardSubtitle}
        badge={isRectorMode ? t("grdHeroRectorBadge") : t("grdTeacherPanel")}
        unlimited={isRectorMode ? t("grdRectorUnlimited") : undefined}
      />

      <CardBody className="px-4 py-5 sm:px-6">
        <div className="grid gap-4">
          {isRectorMode ? studentField : courseField}
          {isRectorMode ? null : studentField}

          {selectedStudent ? (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
                isRectorMode
                  ? "border-brand-200/70 bg-brand-50/60"
                  : "border-slate-200/80 bg-slate-50/70",
              )}
            >
              <Avatar name={selectedStudent.name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedStudent.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {selectedStudent.groupName ?? t("grdStudent")}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                  isRectorMode
                    ? "bg-brand-800 text-white"
                    : "bg-slate-200 text-slate-600",
                )}
              >
                {t(isRectorMode ? "grdBonusWalletBadge" : "grdPupil")}
              </span>
            </div>
          ) : null}

          {isRectorMode ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50/80 via-white to-white px-3.5 py-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white shadow-sm shadow-brand-900/20">
                <WalletIcon />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-900">
                  {t("grdBonusWallet")}
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-700">
                    {t("grdBonusWalletBadge")}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                  {t("grdBonusWalletHint")}
                </p>
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-2xl border border-brand-200/70 bg-[linear-gradient(150deg,#ffffff_0%,#f3f7ff_100%)] p-4 shadow-sm dark:border-white/10 dark:bg-none dark:bg-white/[0.03]">
            <span className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-brand-400/15 blur-2xl" />
            <div className="relative flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isRectorMode ? t("grdBonusAmount") : t("grdScoreLabelColon")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-brand-300">
                <WholeIcon />
                {t("grdWholeNumber")}
              </span>
            </div>

            {isRectorMode ? (
              <>
                <div className="relative mt-3 flex items-stretch gap-1.5 sm:gap-2">
                  <StepButton
                    onClick={() => stepRector(-1)}
                    disabled={rectorPoints <= 1}
                    aria-label="-1"
                    direction="down"
                  />
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-brand-700 dark:text-brand-300">
                      +
                    </span>
                    <input
                      value={rectorAmount}
                      onChange={(event) =>
                        setRectorAmount(event.target.value.replace(/[^0-9]/g, "").slice(0, 7))
                      }
                      onBlur={() => {
                        if (!rectorPoints) setRectorAmount("1");
                      }}
                      inputMode="numeric"
                      aria-label={t("grdBonusAmount")}
                      className="h-12 w-full rounded-xl border border-brand-200 bg-white pl-8 pr-3 text-left text-2xl font-semibold tabular-nums tracking-tight text-brand-950 shadow-inner transition placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 sm:h-14 sm:pr-14 sm:text-3xl dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:inline">
                      {t("grdBall")}
                    </span>
                  </div>
                  <StepButton
                    onClick={() => stepRector(1)}
                    aria-label="+1"
                    direction="up"
                  />
                </div>

                <QuickChips
                  values={quickPoints}
                  activeValue={rectorPoints}
                  onPick={(value) => setRectorAmount(String(value))}
                  label={t("grdBonusQuick")}
                />

                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {t("grdRectorBonusRange")}
                </p>
              </>
            ) : (
              <>
                <div
                  className="relative mt-3 grid grid-cols-4 gap-2"
                  role="group"
                  aria-label={t("grdBonusQuick")}
                >
                  {TEACHER_POINTS.filter((value) => value <= teacherScaleMax).map((value) => {
                    const active = teacherPoints === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setTeacherPoints(value);
                          setMessage(null);
                        }}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all duration-150 active:scale-95",
                          active
                            ? "border-brand-800 bg-gradient-to-b from-brand-800 to-brand-950 text-white shadow-[0_10px_24px_-12px_rgba(19,31,60,0.8)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
                        )}
                      >
                        <span className="text-2xl font-semibold leading-none tabular-nums">
                          {value}
                        </span>
                        <span
                          className={cn(
                            "mt-1 text-[8px] font-bold uppercase tracking-[0.12em]",
                            active ? "text-white/60" : "text-slate-400",
                          )}
                        >
                          {t("grdBall")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {t("grdBonusRange")}
                </p>
              </>
            )}
          </div>

          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border px-4 py-3.5",
              isRectorMode
                ? "border-brand-200/70 bg-gradient-to-br from-brand-50 via-white to-gold-300/10 dark:border-white/10 dark:from-white/[0.04] dark:via-transparent dark:to-transparent"
                : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
            )}
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                  {t(isRectorMode ? "grdBonusPotentialEffect" : "grdBonusEffect")}
                </span>
                {isRectorMode ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <WalletIcon />
                    {t("grdBonusWalletBadge")}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t("grdBonusToScoreChip")}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-3xl font-semibold tabular-nums tracking-tight text-brand-900 dark:text-brand-300">
                +{effectivePoints}{" "}
                <span className="text-xs font-medium text-slate-500">{t("grdBall")}</span>
              </span>
            </div>
            {isRectorMode ? null : (
              <div className="mt-2.5 flex gap-1">
                {Array.from({ length: teacherScaleMax }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-200",
                      index < teacherPoints
                        ? "bg-gradient-to-r from-brand-700 to-brand-400"
                        : "bg-slate-100 dark:bg-white/10",
                    )}
                  />
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {t(isRectorMode ? "grdBonusPotentialHint" : "grdBonusPageSubtitle")}
            </p>
          </div>

          <label className="grid gap-1.5">
            <span className="flex items-baseline justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("grdReason")}
              <span className="text-[11px] font-normal tabular-nums text-slate-500">
                {reason.length}/300
              </span>
            </span>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("grdReasonPlaceholder")}
              maxLength={300}
              rows={2}
              className="resize-none"
            />
          </label>

          <Button
            disabled={disabled}
            onClick={() => startTransition(submit)}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-900 to-brand-700 shadow-[0_14px_30px_-16px_rgba(19,31,60,0.9)] hover:from-brand-800 hover:to-brand-600"
          >
            <SparkIcon />
            {isRectorMode ? t("grdGiveBonusAsRector") : t("grdGiveBonusAction")}
          </Button>

          {message ? (
            <Message tone={message.tone} text={message.text} />
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function FormHeader({
  title,
  subtitle,
  badge,
  unlimited,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  unlimited?: string;
}) {
  return (
    <div className="relative overflow-hidden border-b border-slate-100 bg-[linear-gradient(120deg,#f4f8ff_0%,#ffffff_55%,#fdf8ec_100%)] px-4 py-5 sm:px-6 dark:border-white/10 dark:bg-none dark:bg-white/[0.03]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-800 via-brand-400 to-gold-400" />
      <span className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-brand-400/15 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(19,31,60,0.9)]">
          <SparkIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h3>
            {badge ? (
              <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-brand-300">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {unlimited ? (
        <span className="relative mt-3 inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-300/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-800 dark:text-gold-300">
          <InfinityIcon />
          {unlimited}
        </span>
      ) : null}
    </div>
  );
}

function QuickChips({
  values,
  activeValue,
  onPick,
  label,
}: {
  values: number[];
  activeValue: number;
  onPick: (value: number) => void;
  label: string;
}) {
  return (
    <>
      <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {values.map((value) => {
          const active = activeValue === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPick(value)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-150",
                active
                  ? "border-brand-800 bg-brand-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
              )}
            >
              +{value}
            </button>
          );
        })}
      </div>
    </>
  );
}

function StepButton({
  onClick,
  disabled,
  direction,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  disabled?: boolean;
  direction: "up" | "down";
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:size-14 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
    >
      {direction === "up" ? <PlusIcon /> : <MinusIcon />}
    </button>
  );
}

function Message({ tone, text }: { tone: "ok" | "error"; text: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed",
        tone === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        {tone === "ok" ? (
          <path d="m4 12.5 5 5L20 6.5" />
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16.5h.01" />
          </>
        )}
      </svg>
      <p>{text}</p>
    </div>
  );
}

function InfinityIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 8.5c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c3.5 0 5-7 8.5-7 2 0 3.5 1.5 3.5 3.5S20 15.5 18 15.5c-3.5 0-5-7-8.5-7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5" />
      <path d="M21 8.5h-4.5a3 3 0 0 0 0 6H21v-6Z" />
    </svg>
  );
}

function WholeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h16M8 8h8M8 16h8" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" />
    </svg>
  );
}
