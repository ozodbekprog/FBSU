"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, CardBody, Input, Select, Textarea } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type CreditStudent = { id: string; name: string; groupName: string | null };

const QUICK_CREDITS = [0.1, 0.25, 0.5, 1, 2, 5];

export function CreditAwardForm({ students }: { students: CreditStudent[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [studentQuery, setStudentQuery] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const parsedAmount = Number(amount.replace(",", "."));
  const credits = Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) / 100 : 0;
  const gaugePercent = Math.min(100, Math.max(0, (credits / 4) * 100));

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

  const disabled = !effectiveStudentId || credits <= 0 || reason.trim().length < 3 || pending;
  const selectedStudent =
    students.find((student) => student.id === effectiveStudentId) ?? null;

  function stepCredit(direction: number) {
    const next = Math.max(0, Math.round((credits + direction * 0.1) * 100) / 100);
    setAmount(next > 0 ? String(next) : "");
    setMessage(null);
  }

  async function submit() {
    if (disabled) return;
    setMessage(null);
    try {
      const response = await fetch("/api/credit-awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: effectiveStudentId, credits, reason: reason.trim() }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? t("grdErrorOccurred") });
        return;
      }

      setMessage({
        tone: "ok",
        text: t("grdCreditAwarded", {
          name: selectedStudent?.name ?? t("grdPupil"),
          credits: credits.toFixed(2),
        }),
      });
      setAmount("0.1");
      setReason("");
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: t("grdServerError") });
    }
  }

  const header = (
    <div className="relative overflow-hidden border-b border-gold-500/20 bg-[linear-gradient(120deg,#faf3df_0%,#fffdf8_55%,#f4f1e8_100%)] px-4 py-5 sm:px-6 dark:border-white/10 dark:bg-none dark:bg-white/[0.03]">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-600 via-gold-400 to-transparent" />
      <span className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-gold-400/20 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#211a0e] to-[#5a4517] text-gold-300 shadow-[0_8px_20px_-10px_rgba(80,60,15,0.8)] ring-1 ring-gold-500/30">
            <DiamondIcon size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">
              {t("grdCreditCardTitle")}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t("grdCreditSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold-500/30 bg-gold-300/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-gold-800 dark:text-gold-300">
            {t("grdCreditVipBadge")}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300">
            <InfinityIcon />
            {t("grdCreditUnlimited")}
          </span>
        </div>
      </div>
    </div>
  );

  if (students.length === 0) {
    return (
      <Card className="overflow-hidden">
        {header}
        <CardBody className="px-4 py-5 sm:px-6">
          <div className="flex flex-col items-center py-7 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gold-300/20 text-gold-700 ring-1 ring-gold-500/30">
              <DiamondIcon size={20} />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-800">{t("grdNoCredits")}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
              {t("grdNoCreditsDesc")}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-gold-500/25 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_50px_-30px_rgba(110,82,20,0.35)]">
      {header}

      <CardBody className="px-4 py-5 sm:px-6">
        <div className="grid gap-4">
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
                <p className="text-xs font-medium text-slate-700">
                  {t("grdBonusNoStudentFound")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("grdBonusNoStudentsDesc")}
                </p>
              </div>
            )}
          </div>

          {selectedStudent ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-gold-500/25 bg-gold-300/10 px-3 py-2.5">
              <Avatar name={selectedStudent.name} size={32} color="#d4af37" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedStudent.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {selectedStudent.groupName ?? t("grdStudent")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                {t("grdCreditVipBadge")}
              </span>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-[linear-gradient(150deg,#fffdf7_0%,#faf3e0_100%)] p-4 shadow-sm dark:border-white/10 dark:bg-none dark:bg-white/[0.03]">
            <span className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-gold-300/25 blur-2xl" />
            <div className="relative flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t("grdCreditAmount")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gold-800 dark:text-gold-300">
                <InfinityIcon />
                {t("grdCreditUnlimited")}
              </span>
            </div>

            <div className="relative mt-3 flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => stepCredit(-1)}
                disabled={credits <= 0.1}
                aria-label="-0.1"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-white text-gold-800 shadow-sm transition hover:border-gold-500/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MinusIcon />
              </button>
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-gold-700">
                  +
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                  onBlur={() => {
                    if (credits > 0) setAmount(String(credits));
                  }}
                  placeholder={t("grdCreditAmountPlaceholder")}
                  aria-label={t("grdCreditAmount")}
                  className="h-11 w-full rounded-xl border border-gold-500/30 bg-white pl-7 pr-3 text-left text-xl font-semibold tabular-nums tracking-tight text-slate-900 shadow-inner transition placeholder:text-slate-300 focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-500/15 sm:pr-16"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 text-[9px] font-bold uppercase tracking-[0.1em] text-gold-700 sm:right-3 sm:inline sm:text-[10px]">
                  {t("grdCreditLower")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stepCredit(1)}
                aria-label="+0.1"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-white text-gold-800 shadow-sm transition hover:border-gold-500/50 active:scale-95"
              >
                <PlusIcon />
              </button>
            </div>

            <p className="mt-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-700/80">
              {t("grdCreditQuick")}
            </p>
            <div
              className="mt-1.5 flex flex-wrap gap-1.5"
              role="group"
              aria-label={t("grdCreditQuick")}
            >
              {QUICK_CREDITS.map((value) => {
                const active = Math.abs(credits - value) < 0.001;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors duration-150",
                      active
                        ? "border-gold-600 bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-sm"
                        : "border-gold-500/25 bg-white text-slate-600 hover:border-gold-500/50 hover:text-gold-800",
                    )}
                  >
                    +{value}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-gold-500/35 bg-[linear-gradient(145deg,#fffdf6_0%,#f8efd7_100%)] p-4 shadow-[0_16px_36px_-24px_rgba(110,82,20,0.5)] dark:border-white/10 dark:bg-none dark:bg-white/[0.04]">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-800 dark:text-gold-300">
                {t("grdCreditEffect")}
              </p>
              <span className="rounded-full border border-gold-500/30 bg-white/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-800 dark:bg-white/10 dark:text-gold-300">
                {t("grdCreditVipBadge")}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3.5">
              <div className="relative size-24 shrink-0">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-gold-200/70"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#creditGaugeGradient)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={100 - gaugePercent}
                    className="transition-[stroke-dashoffset] duration-500 ease-out"
                  />
                  <defs>
                    <linearGradient id="creditGaugeGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e3bd57" />
                      <stop offset="100%" stopColor="#a87e1f" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold leading-none tabular-nums tracking-tight text-gold-900 dark:text-gold-300">
                    +{credits.toFixed(2)}
                  </span>
                  <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.18em] text-gold-700/70 dark:text-gold-300/70">
                    GPA
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {t("grdCreditGpaLabel")}
                </p>
                <p className="mt-0.5 text-3xl font-semibold leading-none tabular-nums tracking-tight text-slate-900 dark:text-white">
                  +{credits.toFixed(2)}
                </p>
                <span className="mt-2 inline-flex rounded-full border border-gold-500/30 bg-white/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gold-800 dark:bg-white/10 dark:text-gold-300">
                  {t("grdCreditUpTo")}
                </span>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gold-200/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300 transition-[width] duration-500 ease-out"
                    style={{ width: `${gaugePercent}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              {t("grdCreditHint")}
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-gold-500/25 bg-gold-300/[0.08] px-3 py-2.5">
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#221a0e] to-[#5a4517] text-gold-300">
              <ShieldIcon />
            </span>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              {t("grdCreditVipHint")}
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
            variant="gold"
            disabled={disabled}
            onClick={() => startTransition(submit)}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 shadow-[0_14px_30px_-16px_rgba(147,110,20,0.8)] hover:from-gold-400 hover:to-gold-500"
          >
            <DiamondIcon size={15} />
            {t("grdCreditAction")}
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
      </CardBody>
    </Card>
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
      width="15"
      height="15"
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
      width="15"
      height="15"
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

function ShieldIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.4 2.9 8.2 7 9.5 4.1-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DiamondIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12l4 7-10 11L2 10l4-7Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
