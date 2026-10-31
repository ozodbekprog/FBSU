import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreditAwardForm } from "@/components/gpa/credit-award-form";
import { CreditLedger } from "@/components/gpa/credit-ledger";
import { FbMotion } from "@/components/fb/fb-motion";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.grdGiveCredit };
}

export default async function CreditAwardsPage() {
  const user = await requireRole(["REKTOR", "PRO_RECTOR"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const [students, ledger] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true },
      select: { id: true, name: true, group: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 1000,
    }),
    prisma.creditAward.findMany({
      select: {
        id: true,
        credits: true,
        reason: true,
        createdAt: true,
        student: { select: { id: true, name: true, group: { select: { name: true } } } },
        awardedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const totalCredits = ledger.reduce((sum, row) => sum + row.credits, 0);
  const uniqueStudents = new Set(ledger.map((row) => row.student.id)).size;
  const averageCredits = uniqueStudents > 0 ? totalCredits / uniqueStudents : 0;
  const averagePercent = Math.min(100, (averageCredits / 4) * 100);
  const todayKey = fmtDate(new Date());
  const todayCount = ledger.filter((row) => fmtDate(row.createdAt) === todayKey).length;
  const latest = ledger[0] ?? null;
  const roleLabel = user.role === "REKTOR" ? dictionary.roleRector : dictionary.roleProRector;

  return (
    <div className="fb-dash fb-award">
      <FbMotion variant="dashboard" />
      <header className="fb-dash-head" data-fb-reveal>
        <div>
          <div className="fb-chips">
            <span className="fb-chip blue">{roleLabel}</span>
            <span className="fb-chip">{dictionary.grdCreditUnlimited}</span>
            <span className="fb-chip">{fmtDate(new Date())}</span>
          </div>
          <h1 className="fb-greet">
            {dictionary.grdGiveCredit}
            <span className="fb-serif">.</span>
          </h1>
          <div className="fb-subline">
            <span>+{totalCredits.toFixed(2)} {dictionary.grdCreditLower}</span>
            <i />
            <span>{translate(locale, "grdNStudents", { count: uniqueStudents })}</span>
            <i />
            <span>{translate(locale, "grdRecordsCount", { count: ledger.length })}</span>
          </div>
          <nav className="fb-quick" aria-label={dictionary.dashQuickActions}>
            <span className="fb-quick-label">{dictionary.dashQuickActions}</span>
            <Link href="/bonus-points">
              <SparkIcon />
              {dictionary.grdBonusPoints}
            </Link>
            <Link href="/monitoring">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 20h18" />
                <path d="M6 20V9M11 20V4M16 20v-7M21 20v-4" />
              </svg>
              {dictionary.navMonitoring}
            </Link>
            <Link href="/dashboard">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="8" height="8" rx="2" />
                <rect x="13" y="3" width="8" height="5" rx="2" />
                <rect x="13" y="10" width="8" height="11" rx="2" />
                <rect x="3" y="13" width="8" height="8" rx="2" />
              </svg>
              {dictionary.navDashboard}
            </Link>
          </nav>
        </div>
        <div className="fb-head-actions">
          <Link className="fb-btn" href="/dashboard">
            {dictionary.navDashboard}
          </Link>
          <a className="fb-btn primary" href="#award-form">
            <DiamondIcon />
            {dictionary.grdGiveCredit}
          </a>
        </div>
      </header>

      {latest ? (
        <section className="fb-focus" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {dictionary.grdCreditCardTitle}
            </div>
            <h2>
              +{latest.credits.toFixed(2)} {dictionary.grdCreditLower} · {latest.student.name}
            </h2>
            <div className="fb-focus-meta">
              <b>{latest.student.group?.name ?? dictionary.grdNoGroup}</b>
              <i />
              <span>{latest.awardedBy.name}</span>
              <i />
              <span>{fmtDateTime(latest.createdAt)}</span>
            </div>
          </div>
          <div className="fb-focus-progress">
            <div className="fb-fp-top">
              <span>{dictionary.grdAverage}</span>
              <b>
                {averageCredits.toFixed(2)} / 4.00
              </b>
            </div>
            <div className="fb-fp-track">
              <i style={{ width: `${averagePercent}%` }} />
            </div>
            <div className="fb-fp-bot">{dictionary.grdCreditSubtitle}</div>
          </div>
          <div className="fb-focus-join">
            <span className="fb-zoom">
              <i />
              {dictionary.grdCreditUnlimited}
            </span>
            <a className="fb-join-btn" href="#award-form">
              <DiamondIcon />
              {dictionary.grdGiveCredit}
            </a>
          </div>
        </section>
      ) : (
        <section className="fb-focus no-lesson" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {dictionary.grdCreditCardTitle}
            </div>
            <h2>{dictionary.grdNoCredits}</h2>
            <div className="fb-focus-meta">
              <span>{dictionary.grdNoCreditsDesc}</span>
            </div>
          </div>
          <div className="fb-focus-join">
            <a className="fb-join-btn" href="#award-form">
              {dictionary.grdGiveCredit}
            </a>
          </div>
        </section>
      )}

      <section className="fb-kpis">
        <div className="fb-kpi" data-fb-reveal data-fb-delay="120">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdStatTotalCredits}</span>
            <span className="fb-kpi-ico">
              <DiamondIcon />
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={totalCredits} data-fb-decimals="2">
              {totalCredits.toFixed(2)}
            </b>
            <span>{dictionary.grdCreditLower}</span>
          </div>
          <div className="fb-kpi-foot">
            {translate(locale, "grdCreditsInline", { count: totalCredits.toFixed(2) })}
          </div>
          <div className="fb-kbar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, totalCredits * 10)}%` }} />
          </div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="160">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdStudents}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
                <path d="M16 5.5a3 3 0 0 1 0 5.6M17 20c0-2.2-.6-4-1.7-5" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={uniqueStudents}>{uniqueStudents}</b>
            <span>/ {students.length}</span>
          </div>
          <div className="fb-kpi-foot">
            {translate(locale, "grdNStudents", { count: uniqueStudents })}
          </div>
          <div className="fb-kbar" aria-hidden="true">
            <i
              style={{
                width: `${
                  students.length > 0
                    ? Math.round((uniqueStudents / students.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="200">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdStatRecords}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={ledger.length}>{ledger.length}</b>
          </div>
          <div className="fb-kpi-foot">
            {translate(locale, "grdRecordsCount", { count: ledger.length })}
          </div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="240">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdAverage}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={averageCredits} data-fb-decimals="2">
              {averageCredits.toFixed(2)}
            </b>
            <span>/ 4.00</span>
          </div>
          <div className="fb-kpi-foot">
            {translate(locale, "grdCreditsInline", { count: averageCredits.toFixed(2) })}
          </div>
          <div className="fb-kbar" aria-hidden="true">
            <i style={{ width: `${averagePercent}%` }} />
          </div>
        </div>
      </section>

      <div className="fb-award-grid" id="award-form">
        <div className="min-w-0">
          <CreditAwardForm
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              groupName: student.group?.name ?? null,
            }))}
          />
        </div>

        <div className="min-w-0">
          <CreditLedger
            rows={ledger.map((row) => ({
              id: row.id,
              studentName: row.student.name,
              groupName: row.student.group?.name ?? null,
              credits: row.credits,
              reason: row.reason,
              awardedByName: row.awardedBy.name,
              createdAt: fmtDateTime(row.createdAt),
            }))}
          />
        </div>
      </div>
      <div className="fb-foot-note">
        <span>
          {dictionary.grdGroupToday} ·{" "}
          {translate(locale, "grdRecordsCount", { count: todayCount })}
        </span>
        <span className="fb-foot-sync">
          <i />
          {dictionary.grdCreditHeroBadge}
        </span>
      </div>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
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
