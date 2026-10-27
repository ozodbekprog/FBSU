"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/points";

export type BonusAllocatorGrant = {
  id: string;
  totalTenths: number;
  remainingTenths: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
};

export type BonusAllocatorTarget = {
  courseId: string;
  title: string;
  percent: number | null;
  score: number | null;
  maxScore: number | null;
  appliedTenths: number;
  headroomTenths: number;
};

const QUICK_POINTS = [1, 2, 5, 10, 20, 50];

export function BonusAllocator({
  grants,
  targets,
  walletTenths,
}: {
  grants: BonusAllocatorGrant[];
  targets: BonusAllocatorTarget[];
  walletTenths: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [grantId, setGrantId] = useState(grants[0]?.id ?? "");
  const [courseId, setCourseId] = useState(targets[0]?.courseId ?? "");
  const [points, setPoints] = useState(1);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const selectedGrant = grants.find((grant) => grant.id === grantId) ?? grants[0] ?? null;
  const selectedTarget =
    targets.find((target) => target.courseId === courseId) ?? targets[0] ?? null;

  const maxPoints =
    selectedGrant && selectedTarget
      ? Math.floor(
          Math.min(selectedGrant.remainingTenths, selectedTarget.headroomTenths) / 10,
        )
      : 0;
  const effectivePoints = maxPoints > 0 ? Math.max(1, Math.min(points, maxPoints)) : 0;
  const currentPercent = selectedTarget?.percent ?? 0;
  const maxScore = selectedTarget?.maxScore ?? 0;
  const currentScore =
    (selectedTarget?.score ?? 0) + (selectedTarget?.appliedTenths ?? 0) / 10;
  const projectedScore =
    maxScore > 0 ? Math.min(maxScore, currentScore + effectivePoints) : currentScore;
  const projectedPercent =
    maxScore > 0
      ? Math.min(100, Math.max(0, Math.round((projectedScore / maxScore) * 100)))
      : currentPercent;
  const disabled =
    !selectedGrant || !selectedTarget || effectivePoints <= 0 || pending;

  const totalGrantTenths = grants.reduce((sum, grant) => sum + grant.totalTenths, 0);
  const usedTenths = Math.max(0, totalGrantTenths - walletTenths);
  const usedPercent =
    totalGrantTenths > 0 ? Math.min(100, Math.round((usedTenths / totalGrantTenths) * 100)) : 0;

  const quickPoints = useMemo(
    () => QUICK_POINTS.filter((value) => value <= maxPoints),
    [maxPoints],
  );

  function clampPoints(nextMax: number) {
    if (nextMax > 0) setPoints((value) => Math.max(1, Math.min(value, nextMax)));
  }

  function chooseGrant(id: string) {
    setGrantId(id);
    const grant = grants.find((row) => row.id === id);
    clampPoints(
      Math.floor(
        Math.min(grant?.remainingTenths ?? 0, selectedTarget?.headroomTenths ?? 0) / 10,
      ),
    );
  }

  function chooseTarget(id: string) {
    setCourseId(id);
    const target = targets.find((row) => row.courseId === id);
    clampPoints(
      Math.floor(
        Math.min(selectedGrant?.remainingTenths ?? 0, target?.headroomTenths ?? 0) / 10,
      ),
    );
  }

  async function submit() {
    if (disabled || !selectedGrant || !selectedTarget) return;
    setMessage(null);
    try {
      const response = await fetch("/api/bonus-points/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusPointId: selectedGrant.id,
          courseId: selectedTarget.courseId,
          tenths: effectivePoints * 10,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: { percent?: number };
      };

      if (!payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? t("grdErrorOccurred") });
        return;
      }

      setMessage({
        tone: "ok",
        text: t("grdBonusAllocated", {
          course: selectedTarget.title,
          points: effectivePoints,
          percent: payload.data?.percent ?? projectedPercent,
        }),
      });
      setPoints(1);
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: t("grdServerError") });
    }
  }

  const header = (
    <div className="relative overflow-hidden border-b border-slate-200/70 bg-[linear-gradient(120deg,#eef4ff_0%,#ffffff_55%,#fdf8ec_100%)] px-4 py-5 sm:px-6 dark:border-white/10 dark:bg-none dark:bg-white/[0.03]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-800 via-brand-400 to-gold-400" />
      <span className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-brand-400/15 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-600 text-white shadow-[0_8px_20px_-10px_rgba(19,31,60,0.9)]">
            <WalletIcon />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">
                {t("grdBonusWallet")}
              </h2>
              <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-brand-300">
                {t("grdBonusWalletBadge")}
              </span>
            </div>
            <p className="mt-0.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t("grdBonusWalletSubtitle", { points: formatPoints(walletTenths / 10) })}
            </p>
          </div>
        </div>
        <div className="w-full rounded-2xl border border-brand-100 bg-white/80 px-4 py-2.5 shadow-sm sm:w-auto dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {t("grdWalletBalance")}
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none tabular-nums tracking-tight text-brand-900 sm:text-3xl dark:text-brand-300">
            +{formatPoints(walletTenths / 10)}
            <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">
              {t("grdBall")}
            </span>
          </p>
        </div>
      </div>

      {grants.length > 0 ? (
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <span>{t("grdBonusAllocations")}</span>
            <span className="tabular-nums tracking-normal">
              {formatPoints(usedTenths / 10)} / {formatPoints(totalGrantTenths / 10)}{" "}
              {t("grdBall")}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-700 via-brand-500 to-gold-400 transition-[width] duration-500 ease-out"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  if (grants.length === 0) {
    return (
      <Card className="overflow-hidden">
        {header}
        <CardBody>
          <div className="flex flex-col items-center py-7 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <WalletIcon />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {t("grdBonusWalletEmpty")}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              {t("grdBonusWalletEmptyDesc")}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (targets.length === 0) {
    return (
      <Card className="overflow-hidden">
        {header}
        <CardBody>
          <div className="flex flex-col items-center py-6 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <BookIcon />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {t("grdBonusNoTargets")}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              {t("grdBonusNoTargetsDesc")}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {header}
      <CardBody className="p-0">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 grid-cols-1 gap-5 px-4 py-5 sm:px-6">
            <div>
              <SectionLabel
                step="01"
                label={t("grdBonusChooseGrant")}
                meta={
                  selectedGrant
                    ? `+${formatPoints(selectedGrant.remainingTenths / 10)} ${t("grdBall")}`
                    : undefined
                }
              />
              {grants.length > 1 ? (
                <div className="mt-2 grid gap-2">
                  {grants.map((grant) => {
                    const active = grant.id === selectedGrant?.id;
                    return (
                      <button
                        key={grant.id}
                        type="button"
                        onClick={() => chooseGrant(grant.id)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                          active
                            ? "border-brand-500/60 bg-brand-50/70 ring-2 ring-brand-500/10 dark:bg-brand-400/10"
                            : "border-slate-200/80 bg-white hover:border-brand-300 dark:border-white/10 dark:bg-white/[0.03]",
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                            +{formatPoints(grant.remainingTenths / 10)}{" "}
                            <span className="text-xs font-medium text-slate-500">
                              {t("grdBall")}
                            </span>
                          </span>
                          <span className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                            {t("grdBonusRemaining", {
                              points: formatPoints(grant.remainingTenths / 10),
                            })}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-slate-600 dark:text-slate-400">
                          {grant.reason}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <span className="size-1 rounded-full bg-brand-500" />
                            {grant.awardedByName}
                          </span>
                          <span>{grant.createdAt}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : selectedGrant ? (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3.5 py-3 dark:border-white/15 dark:bg-white/[0.03]">
                  <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-700 to-brand-400" />
                  <div className="flex items-start justify-between gap-3 pl-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {selectedGrant.reason}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1 rounded-full bg-brand-500" />
                          {selectedGrant.awardedByName}
                        </span>
                        <span>{selectedGrant.createdAt}</span>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand-800 dark:bg-brand-400/15 dark:text-brand-300">
                      +{formatPoints(selectedGrant.remainingTenths / 10)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <SectionLabel
                step="02"
                label={t("grdBonusChooseSubject")}
                meta={`${targets.length} ${t("grdStatSubjects").toLowerCase()}`}
              />
              <div className="mt-2 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {targets.map((target) => {
                  const active = target.courseId === selectedTarget?.courseId;
                  const percent = target.percent;
                  const headroomPoints = Math.floor(target.headroomTenths / 10);
                  return (
                    <button
                      key={target.courseId}
                      type="button"
                      onClick={() => chooseTarget(target.courseId)}
                      aria-pressed={active}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border p-3 text-left transition-colors duration-150",
                        active
                          ? "border-brand-500/60 bg-brand-50/70 ring-2 ring-brand-500/10 dark:bg-brand-400/10"
                          : "border-slate-200/80 bg-white hover:border-brand-300 hover:bg-brand-50/30 dark:border-white/10 dark:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 min-w-0 text-xs font-semibold leading-snug text-slate-900 dark:text-white">
                          {target.title}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                            active
                              ? "bg-brand-800 text-white"
                              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                          )}
                        >
                          {percent == null ? "—" : `${percent}%`}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-[width] duration-300",
                            active
                              ? "from-brand-800 to-brand-400"
                              : "from-slate-400 to-slate-300",
                          )}
                          style={{ width: `${percent ?? 0}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                        <span className="tabular-nums">
                          {formatPoints((target.score ?? 0) + target.appliedTenths / 10)} /{" "}
                          {target.maxScore ?? 0} {t("grdBall")}
                        </span>
                        <span className="font-semibold text-brand-700 dark:text-brand-300">
                          +{headroomPoints} {t("grdBall")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionLabel step="03" label={t("grdScoreLabelColon")} />
              <div className="mt-2 rounded-2xl border border-brand-200/70 bg-[linear-gradient(150deg,#ffffff_0%,#f3f7ff_100%)] p-3.5 shadow-sm dark:border-white/10 dark:bg-none dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-brand-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                      {t("grdBonusToScoreChip")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:border-white/15 dark:bg-white/[0.06] dark:text-brand-300">
                      <WholeIcon />
                      {t("grdWholeNumber")}
                    </span>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    <StepButton
                      onClick={() => setPoints(Math.max(1, effectivePoints - 1))}
                      disabled={effectivePoints <= 1 || maxPoints <= 0}
                      aria-label="-1"
                      direction="down"
                    />
                    <span className="inline-flex min-w-20 items-baseline justify-center gap-1">
                      <span className="text-2xl font-semibold tabular-nums tracking-tight text-brand-950 dark:text-white">
                        +{effectivePoints}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        {t("grdBall")}
                      </span>
                    </span>
                    <StepButton
                      onClick={() =>
                        setPoints(Math.min(Math.max(1, maxPoints), effectivePoints + 1))
                      }
                      disabled={maxPoints <= 0 || effectivePoints >= maxPoints}
                      aria-label="+1"
                      direction="up"
                    />
                  </div>
                </div>

                <div className="relative mt-3 flex h-6 items-center">
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-200 dark:bg-white/10" />
                  <div
                    className="pointer-events-none absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-800 via-brand-500 to-gold-400"
                    style={{
                      width: `${maxPoints > 0 ? (effectivePoints / maxPoints) * 100 : 0}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, maxPoints)}
                    step={1}
                    value={effectivePoints || 1}
                    disabled={maxPoints <= 0}
                    onChange={(event) => setPoints(Number(event.target.value))}
                    aria-label={t("grdBonusChooseSubject")}
                    aria-valuetext={`+${effectivePoints} ball`}
                    className="relative z-10 h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 disabled:cursor-not-allowed [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand-700 [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-700 [&::-webkit-slider-thumb]:shadow-[0_1px_6px_rgba(19,31,60,0.45)]"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <span>+1</span>
                  <span>+{maxPoints}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t("grdBonusQuick")}>
                  {quickPoints.map((value) => {
                    const active = effectivePoints === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPoints(value)}
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
                  {maxPoints > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPoints(maxPoints)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-150",
                        effectivePoints === maxPoints
                          ? "border-gold-600 bg-gold-500 text-brand-950"
                          : "border-gold-500/40 bg-gold-300/10 text-gold-800 hover:bg-gold-300/20 dark:text-gold-300",
                      )}
                    >
                      {t("grdBonusMax")} · +{maxPoints}
                    </button>
                  ) : null}
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {t("grdBonusProjectedHint", { points: effectivePoints })}
                </p>
              </div>
            </div>

            <Button
              disabled={disabled}
              onClick={() => startTransition(submit)}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-900 to-brand-700 shadow-[0_14px_30px_-16px_rgba(19,31,60,0.9)] hover:from-brand-800 hover:to-brand-600"
            >
              <SparkIcon />
              {t("grdBonusAllocateAction")}
            </Button>

            {message ? (
              <div
                role="status"
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed",
                  message.tone === "ok"
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
                  {message.tone === "ok" ? (
                    <path d="m4 12.5 5 5L20 6.5" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5v5M12 16.5h.01" />
                    </>
                  )}
                </svg>
                <p>{message.text}</p>
              </div>
            ) : null}
          </div>

          <aside className="min-w-0 border-t border-slate-100 bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_60%)] px-4 py-5 sm:px-6 lg:border-l lg:border-t-0 dark:border-white/10 dark:bg-none dark:bg-white/[0.02]">
            <div className="relative overflow-hidden rounded-2xl border border-brand-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-800 via-brand-400 to-gold-400" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
                  {t("grdBonusProjected")}
                </p>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-brand-800 dark:bg-brand-400/15 dark:text-brand-300">
                  +{effectivePoints} {t("grdBall")}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {t("grdBonusCurrent")}
                  </p>
                  <p className="mt-0.5 text-base font-semibold leading-tight tabular-nums text-slate-700 sm:text-lg dark:text-slate-200">
                    {formatPoints(currentScore)}
                    <span className="ml-1 text-[10px] font-medium text-slate-400">
                      / {maxScore}
                    </span>
                  </p>
                  <p className="text-[11px] font-semibold tabular-nums text-slate-400">
                    {selectedTarget?.percent == null ? "—" : `${currentPercent}%`}
                  </p>
                </div>
                <ArrowIcon />
                <div className="min-w-0 text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-300">
                    {t("grdBonusAfter")}
                  </p>
                  <p className="mt-0.5 text-base font-semibold leading-tight tabular-nums text-brand-800 sm:text-lg dark:text-brand-300">
                    {formatPoints(projectedScore)}
                    <span className="ml-1 text-[10px] font-medium text-slate-400">
                      / {maxScore}
                    </span>
                  </p>
                  <p className="text-xl font-semibold leading-tight tabular-nums text-brand-900 dark:text-brand-300">
                    {projectedPercent}%
                  </p>
                </div>
              </div>

              <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-brand-100 dark:bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-800/80 dark:bg-brand-400/70"
                  style={{ width: `${currentPercent}%` }}
                />
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                  style={{
                    left: `${currentPercent}%`,
                    width: `${Math.max(0, projectedPercent - currentPercent)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t("grdBonusProjectedHint", { points: effectivePoints })}
              </p>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-200/70 bg-brand-50/60 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-800 text-white">
                <InfoIcon />
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {t("grdBonusRawHint")}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t("grdBonusHowItWorks")}
              </p>
              <ol className="mt-3 space-y-2.5">
                {[t("grdBonusStep1"), t("grdBonusStep2"), t("grdBonusStep3")].map(
                  (step, index) => (
                    <li key={step} className="flex gap-2.5">
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-800 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        {step}
                      </span>
                    </li>
                  ),
                )}
              </ol>
            </div>
          </aside>
        </div>
      </CardBody>
    </Card>
  );
}

function SectionLabel({
  step,
  label,
  meta,
}: {
  step: string;
  label: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[9px] font-bold text-white">
          {step}
        </span>
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
      {meta ? (
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
          {meta}
        </span>
      ) : null}
    </div>
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
      className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
    >
      {direction === "up" ? <PlusIcon /> : <MinusIcon />}
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mb-1 shrink-0 text-slate-300"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5" />
      <path d="M21 8.5h-4.5a3 3 0 0 0 0 6H21v-6Z" />
      <path d="M16.8 11.5h.01" />
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

function InfoIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width="14"
      height="14"
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
      width="14"
      height="14"
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
