"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn, initials } from "@/lib/utils";

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
      <section className="fb-card">
        <FormHeader title={cardTitle} subtitle={cardSubtitle} />
        <div className="fb-empty-box">
          <span className="fb-ava">
            <BookIcon />
          </span>
          <b>{t("grdNoSubjectAssigned")}</b>
          <p>{t("grdNoSubjectAssignedDesc")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="fb-card">
      <FormHeader
        title={cardTitle}
        subtitle={cardSubtitle}
        badge={isRectorMode ? t("grdHeroRectorBadge") : t("grdTeacherPanel")}
      />

      <div className="fb-form">
        {!isRectorMode ? (
          <label className="fb-field">
            <span className="fb-lab">{t("grdSubject")}</span>
            <select
              className="fb-select"
              value={effectiveCourseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

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
            <span className="fb-ava">
              {initials(selectedStudent.name)}
            </span>
            <span className="fb-picked-txt">
              <b>{selectedStudent.name}</b>
              <span>{selectedStudent.groupName ?? t("grdStudent")}</span>
            </span>
            <span className="fb-mini blue">
              {t(isRectorMode ? "grdBonusWalletBadge" : "grdPupil")}
            </span>
          </div>
        ) : null}

        {isRectorMode ? (
          <div className="fb-hint plain">
            <WalletIcon />
            <p>{t("grdBonusWalletHint")}</p>
          </div>
        ) : null}

        <div className="fb-amount">
          <div className="fb-amount-top">
            <span>{isRectorMode ? t("grdBonusAmount") : t("grdScoreLabelColon")}</span>
            <span className="fb-mini">
              <WholeIcon />
              {t("grdWholeNumber")}
            </span>
          </div>

          {isRectorMode ? (
            <>
              <div className="fb-amount-row">
                <button
                  type="button"
                  className="fb-step"
                  onClick={() => stepRector(-1)}
                  disabled={rectorPoints <= 1}
                  aria-label="-1"
                >
                  <MinusIcon />
                </button>
                <div className="fb-amount-field">
                  <span className="plus">+</span>
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
                  />
                  <span className="unit">{t("grdBall")}</span>
                </div>
                <button
                  type="button"
                  className="fb-step"
                  onClick={() => stepRector(1)}
                  aria-label="+1"
                >
                  <PlusIcon />
                </button>
              </div>

              <div className="fb-picks" role="group" aria-label={t("grdBonusQuick")}>
                {quickPoints.map((value) => {
                  const active = rectorPoints === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn("fb-pick", active && "on")}
                      onClick={() => setRectorAmount(String(value))}
                      aria-pressed={active}
                    >
                      +{value}
                    </button>
                  );
                })}
              </div>

              <p className="fb-effect-note">{t("grdRectorBonusRange")}</p>
            </>
          ) : (
            <>
              <div
                className="fb-picks quad"
                role="group"
                aria-label={t("grdBonusQuick")}
              >
                {TEACHER_POINTS.filter((value) => value <= teacherScaleMax).map((value) => {
                  const active = teacherPoints === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn("fb-pick", active && "on")}
                      onClick={() => {
                        setTeacherPoints(value);
                        setMessage(null);
                      }}
                      aria-pressed={active}
                    >
                      <b>{value}</b>
                      <small>{t("grdBall")}</small>
                    </button>
                  );
                })}
              </div>

              <p className="fb-effect-note">{t("grdBonusRange")}</p>
            </>
          )}
        </div>

        <div className="fb-effect">
          <div className="fb-effect-top">
            <div>
              <span>{t(isRectorMode ? "grdBonusPotentialEffect" : "grdBonusEffect")}</span>
              <p>{t(isRectorMode ? "grdBonusWalletBadge" : "grdBonusToScoreChip")}</p>
            </div>
            <b>
              +{effectivePoints}
              <small>{t("grdBall")}</small>
            </b>
          </div>
          {isRectorMode ? null : (
            <div className="fb-meter">
              <i style={{ width: `${(teacherPoints / teacherScaleMax) * 100}%` }} />
            </div>
          )}
          <p className="fb-effect-note">
            {t(isRectorMode ? "grdBonusPotentialHint" : "grdBonusPageSubtitle")}
          </p>
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
          className="fb-cta"
          disabled={disabled}
          onClick={() => startTransition(submit)}
        >
          <SparkIcon />
          {isRectorMode ? t("grdGiveBonusAsRector") : t("grdGiveBonusAction")}
        </button>

        {message ? <Message tone={message.tone} text={message.text} /> : null}
      </div>
    </section>
  );
}

function FormHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="fb-card-head">
      <div className="fb-head-txt">
        <h3>{title}</h3>
        <span className="fb-tagline">{subtitle}</span>
      </div>
      {badge ? <span className="fb-mini blue">{badge}</span> : null}
    </div>
  );
}

function Message({ tone, text }: { tone: "ok" | "error"; text: string }) {
  return (
    <div role="status" className={cn("fb-alert", tone === "ok" ? "ok" : "err")}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5" />
      <path d="M21 8.5h-4.5a3 3 0 0 0 0 6H21v-6Z" />
    </svg>
  );
}

function WholeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h16M8 8h8M8 16h8" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" />
    </svg>
  );
}
