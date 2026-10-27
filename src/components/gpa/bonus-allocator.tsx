"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
      /* Hamyon bo'shasa karta almashadi — tasdiq xabari ko'rinishi uchun kechiktiramiz. */
      window.setTimeout(() => router.refresh(), 1400);
    } catch {
      setMessage({ tone: "error", text: t("grdServerError") });
    }
  }

  const header = (
    <div className="fb-card-head">
      <div className="fb-head-txt">
        <h3>{t("grdBonusWallet")}</h3>
        <span className="fb-tagline">
          {t("grdBonusWalletSubtitle", { points: formatPoints(walletTenths / 10) })}
        </span>
      </div>
      <span className="fb-mini gold">
        +{formatPoints(walletTenths / 10)} {t("grdBall")}
      </span>
    </div>
  );

  if (grants.length === 0) {
    return (
      <section className="fb-card">
        {header}
        <div className="fb-empty-box">
          <span className="fb-ava">
            <WalletIcon />
          </span>
          <b>{t("grdBonusWalletEmpty")}</b>
          <p>{t("grdBonusWalletEmptyDesc")}</p>
        </div>
      </section>
    );
  }

  if (targets.length === 0) {
    return (
      <section className="fb-card">
        {header}
        <div className="fb-empty-box">
          <span className="fb-ava">
            <BookIcon />
          </span>
          <b>{t("grdBonusNoTargets")}</b>
          <p>{t("grdBonusNoTargetsDesc")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="fb-card">
      {header}

      <div className="fb-wallet">
        <div className="fb-wallet-top">
          <span>{t("grdBonusAllocations")}</span>
          <b>
            {t("grdBonusUsedOf", {
              used: formatPoints(usedTenths / 10),
              total: formatPoints(totalGrantTenths / 10),
            })}
          </b>
        </div>
        <div className="fb-meter">
          <i style={{ width: `${usedPercent}%` }} />
        </div>
      </div>

      <div className="fb-alloc-grid">
        <div className="fb-form">
          <div className="fb-field">
            <div className="fb-sec">
              <span className="fb-sec-n">01</span>
              <span className="fb-sec-t">{t("grdBonusChooseGrant")}</span>
              {selectedGrant ? (
                <em>
                  +{formatPoints(selectedGrant.remainingTenths / 10)} {t("grdBall")}
                </em>
              ) : null}
            </div>

            {grants.length > 1 ? (
              <div className="fb-targets">
                {grants.map((grant) => {
                  const active = grant.id === selectedGrant?.id;
                  return (
                    <button
                      key={grant.id}
                      type="button"
                      onClick={() => chooseGrant(grant.id)}
                      aria-pressed={active}
                      className={cn("fb-target", active && "on")}
                    >
                      <span className="fb-target-top">
                        <b>{grant.reason}</b>
                        <span>+{formatPoints(grant.remainingTenths / 10)}</span>
                      </span>
                      <span className="fb-target-bot">
                        <span>{grant.awardedByName}</span>
                        <span>{grant.createdAt}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : selectedGrant ? (
              <div className="fb-picked">
                <span className="fb-ava gold">
                  <WalletIcon />
                </span>
                <span className="fb-picked-txt">
                  <b>{selectedGrant.reason}</b>
                  <span>
                    {selectedGrant.awardedByName} · {selectedGrant.createdAt}
                  </span>
                </span>
                <span className="fb-mini gold">
                  +{formatPoints(selectedGrant.remainingTenths / 10)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="fb-field">
            <div className="fb-sec">
              <span className="fb-sec-n">02</span>
              <span className="fb-sec-t">{t("grdBonusChooseSubject")}</span>
              <em>
                {targets.length} {t("grdStatSubjects").toLowerCase()}
              </em>
            </div>
            <div className="fb-targets">
              {targets.map((target) => {
                const active = target.courseId === selectedTarget?.courseId;
                const headroomPoints = Math.floor(target.headroomTenths / 10);
                return (
                  <button
                    key={target.courseId}
                    type="button"
                    onClick={() => chooseTarget(target.courseId)}
                    aria-pressed={active}
                    className={cn("fb-target", active && "on")}
                  >
                    <span className="fb-target-top">
                      <b>{target.title}</b>
                      <span>{target.percent == null ? "—" : `${target.percent}%`}</span>
                    </span>
                    <span className="fb-target-bar">
                      <i style={{ width: `${target.percent ?? 0}%` }} />
                    </span>
                    <span className="fb-target-bot">
                      <span>
                        {formatPoints((target.score ?? 0) + target.appliedTenths / 10)} /{" "}
                        {target.maxScore ?? 0} {t("grdBall")}
                      </span>
                      <b>
                        +{headroomPoints} {t("grdBall")}
                      </b>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fb-field">
            <div className="fb-sec">
              <span className="fb-sec-n">03</span>
              <span className="fb-sec-t">{t("grdScoreLabelColon")}</span>
              <em>{t("grdBonusToScoreChip")}</em>
            </div>

            <div className="fb-amount">
              <div className="fb-amount-top">
                <span>{t("grdBonusAmount")}</span>
                <span className="fb-mini gold">
                  <WholeIcon />
                  {t("grdWholeNumber")}
                </span>
              </div>

              <div className="fb-amount-row">
                <button
                  type="button"
                  className="fb-step"
                  onClick={() => setPoints(Math.max(1, effectivePoints - 1))}
                  disabled={effectivePoints <= 1 || maxPoints <= 0}
                  aria-label="-1"
                >
                  <MinusIcon />
                </button>
                <div className="fb-amount-field">
                  <span className="plus">+</span>
                  <input
                    value={effectivePoints}
                    readOnly
                    aria-label={t("grdBonusAmount")}
                  />
                  <span className="unit">{t("grdBall")}</span>
                </div>
                <button
                  type="button"
                  className="fb-step"
                  onClick={() =>
                    setPoints(Math.min(Math.max(1, maxPoints), effectivePoints + 1))
                  }
                  disabled={maxPoints <= 0 || effectivePoints >= maxPoints}
                  aria-label="+1"
                >
                  <PlusIcon />
                </button>
              </div>

              <input
                type="range"
                className="fb-range"
                min={1}
                max={Math.max(1, maxPoints)}
                step={1}
                value={effectivePoints || 1}
                disabled={maxPoints <= 0}
                onChange={(event) => setPoints(Number(event.target.value))}
                aria-label={t("grdBonusChooseSubject")}
                aria-valuetext={`+${effectivePoints} ${t("grdBall")}`}
              />

              <div className="fb-picks" role="group" aria-label={t("grdBonusQuick")}>
                {quickPoints.map((value) => {
                  const active = effectivePoints === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn("fb-pick", active && "on")}
                      onClick={() => setPoints(value)}
                      aria-pressed={active}
                    >
                      +{value}
                    </button>
                  );
                })}
                {maxPoints > 0 ? (
                  <button
                    type="button"
                    className={cn("fb-pick", effectivePoints === maxPoints && "on")}
                    onClick={() => setPoints(maxPoints)}
                  >
                    {t("grdBonusMax")} · +{maxPoints}
                  </button>
                ) : null}
              </div>

              {maxPoints <= 0 ? (
                <p className="fb-effect-note">{t("grdBonusNoTargetsDesc")}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="fb-cta"
            disabled={disabled}
            onClick={() => startTransition(submit)}
          >
            <SparkIcon />
            {t("grdBonusAllocateAction")}
          </button>

          {message ? (
            <div role="status" className={cn("fb-alert", message.tone === "ok" ? "ok" : "err")}>
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

        <aside className="fb-proj">
          <span className="fb-proj-lab">{t("grdBonusProjected")}</span>
          <p className="fb-proj-big">
            +{effectivePoints}
            <small>{t("grdBall")}</small>
          </p>
          <div className="fb-proj-scores">
            <div>
              <span>
                {t("grdBonusCurrent")} ·{" "}
                {selectedTarget?.percent == null ? "—" : `${currentPercent}%`}
              </span>
              <b>
                {formatPoints(currentScore)} / {maxScore}
              </b>
            </div>
            <i className="fb-proj-arrow" aria-hidden="true">
              →
            </i>
            <div>
              <span>
                {t("grdBonusAfter")} · {projectedPercent}%
              </span>
              <b>
                {formatPoints(projectedScore)} / {maxScore}
              </b>
            </div>
          </div>
          <div className="fb-meter">
            <i style={{ width: `${projectedPercent}%` }} />
          </div>
          <p className="fb-effect-note">
            {t("grdBonusProjectedHint", { points: effectivePoints })}
          </p>
          <div className="fb-hint">
            <InfoIcon />
            <p>{t("grdBonusRawHint")}</p>
          </div>
          <ul className="fb-note-list">
            {[t("grdBonusStep1"), t("grdBonusStep2"), t("grdBonusStep3")].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
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

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
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

function WholeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h16M8 8h8M8 16h8" />
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
