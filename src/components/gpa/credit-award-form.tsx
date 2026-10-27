"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn, initials } from "@/lib/utils";

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

  if (students.length === 0) {
    return (
      <section className="fb-card">
        <div className="fb-card-head">
          <div className="fb-head-txt">
            <h3>{t("grdCreditCardTitle")}</h3>
            <span className="fb-tagline">{t("grdCreditSubtitle")}</span>
          </div>
        </div>
        <div className="fb-empty-box">
          <span className="fb-ava gold">
            <DiamondIcon />
          </span>
          <b>{t("grdNoCredits")}</b>
          <p>{t("grdNoCreditsDesc")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="fb-card">
      <div className="fb-card-head">
        <div className="fb-head-txt">
          <h3>{t("grdCreditCardTitle")}</h3>
          <span className="fb-tagline">{t("grdCreditSubtitle")}</span>
        </div>
        <span className="fb-mini gold">
          <DiamondIcon />
          {t("grdCreditVipBadge")}
        </span>
      </div>

      <div className="fb-form">
        <div className="fb-field">
          <div className="fb-lab">
            <span>{t("grdPupil")}</span>
            <em>
              {filteredStudents.length} / {students.length}
            </em>
          </div>
          <div className="fb-search">
            <SearchIcon />
            <input
              className="fb-input"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder={t("grdBonusSearchStudent")}
              aria-label={t("grdBonusSearchStudent")}
            />
          </div>
          {filteredStudents.length > 0 ? (
            <select
              className="fb-select"
              value={effectiveStudentId}
              onChange={(event) => setStudentId(event.target.value)}
              aria-label={t("grdPupil")}
            >
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.groupName ? ` — ${student.groupName}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="fb-empty-box inset">
              <b>{t("grdBonusNoStudentFound")}</b>
              <p>{t("grdBonusNoStudentsDesc")}</p>
            </div>
          )}
        </div>

        {selectedStudent ? (
          <div className="fb-picked">
            <span className="fb-ava gold">{initials(selectedStudent.name)}</span>
            <span className="fb-picked-txt">
              <b>{selectedStudent.name}</b>
              <span>{selectedStudent.groupName ?? t("grdStudent")}</span>
            </span>
            <span className="fb-mini gold">{t("grdCreditVipBadge")}</span>
          </div>
        ) : null}

        <div className="fb-amount">
          <div className="fb-amount-top">
            <span>{t("grdCreditAmount")}</span>
            <span className="fb-mini gold">
              <InfinityIcon />
              {t("grdCreditUnlimited")}
            </span>
          </div>

          <div className="fb-amount-row">
            <button
              type="button"
              className="fb-step"
              onClick={() => stepCredit(-1)}
              disabled={credits <= 0.1}
              aria-label="-0.1"
            >
              <MinusIcon />
            </button>
            <div className="fb-amount-field">
              <span className="plus">+</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^0-9.,]/g, ""))
                }
                onBlur={() => {
                  if (credits > 0) setAmount(String(credits));
                }}
                placeholder={t("grdCreditAmountPlaceholder")}
                aria-label={t("grdCreditAmount")}
              />
              <span className="unit">{t("grdCreditLower")}</span>
            </div>
            <button
              type="button"
              className="fb-step"
              onClick={() => stepCredit(1)}
              aria-label="+0.1"
            >
              <PlusIcon />
            </button>
          </div>

          <p className="fb-effect-note">{t("grdCreditQuick")}</p>
          <div className="fb-picks" role="group" aria-label={t("grdCreditQuick")}>
            {QUICK_CREDITS.map((value) => {
              const active = Math.abs(credits - value) < 0.001;
              return (
                <button
                  key={value}
                  type="button"
                  className={cn("fb-pick", active && "on")}
                  onClick={() => setAmount(String(value))}
                  aria-pressed={active}
                >
                  +{value}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fb-effect">
          <div className="fb-effect-top">
            <div>
              <span>{t("grdCreditEffect")}</span>
              <p>{t("grdCreditGpaLabel")}</p>
            </div>
            <b>
              +{credits.toFixed(2)}
              <small>{t("grdGpaScore")}</small>
            </b>
          </div>
          <div className="fb-meter">
            <i style={{ width: `${gaugePercent}%` }} />
          </div>
          <p className="fb-effect-note">{t("grdCreditHint")}</p>
        </div>

        <div className="fb-hint gold">
          <ShieldIcon />
          <p>{t("grdCreditVipHint")}</p>
        </div>

        <label className="fb-field">
          <span className="fb-lab">
            {t("grdReason")}
            <em>
              {reason.length}/300
            </em>
          </span>
          <textarea
            className="fb-textarea"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("grdReasonPlaceholder")}
            maxLength={300}
            rows={2}
          />
        </label>

        <button
          type="button"
          className="fb-cta gold"
          disabled={disabled}
          onClick={() => startTransition(submit)}
        >
          <DiamondIcon />
          {t("grdCreditAction")}
        </button>

        {message ? (
          <div
            role="status"
            className={cn("fb-alert", message.tone === "ok" ? "ok" : "err")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
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
    </section>
  );
}

function InfinityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.5c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c3.5 0 5-7 8.5-7 2 0 3.5 1.5 3.5 3.5S20 15.5 18 15.5c-3.5 0-5-7-8.5-7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.4 2.9 8.2 7 9.5 4.1-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12l4 7-10 11L2 10l4-7Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
