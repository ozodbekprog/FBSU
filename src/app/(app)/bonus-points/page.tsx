import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BonusAwardForm } from "@/components/gpa/bonus-award-form";
import { BonusAllocator } from "@/components/gpa/bonus-allocator";
import { BonusGrantHistory } from "@/components/gpa/bonus-grant-history";
import { BonusLedger } from "@/components/gpa/bonus-ledger";
import { FbMotion } from "@/components/fb/fb-motion";
import {
  BONUS_MAX_TENTHS,
  BONUS_MIN_TENTHS,
  BONUS_RECTOR_MIN_TENTHS,
  getStudentBonusOverview,
} from "@/app/api/gpa/data";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { formatPoints } from "@/lib/points";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.grdBonusPoints };
}

export default async function BonusPointsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (user.role === "STUDENT") {
    const overview = await getStudentBonusOverview(user.id);

    // Faqat rektor bergan (fanga bog'lanmagan) va butun ball ishlatish mumkin bo'lgan grantlar.
    const walletGrants = overview.grants
      .filter((grant) => grant.courseId === null && grant.remainingTenths >= 10)
      .map((grant) => ({
        id: grant.id,
        totalTenths: grant.totalTenths,
        remainingTenths: grant.remainingTenths,
        reason: grant.reason,
        awardedByName: grant.awardedByName,
        createdAt: fmtDateTime(grant.createdAt),
      }));

    // 100% ga yetgan yoki butun ball sig'maydigan fanlar chiqariladi.
    const targets = overview.targets
      .filter((target) => target.headroomTenths >= 10)
      .sort((a, b) => {
        if (a.percent == null && b.percent == null) return a.title.localeCompare(b.title);
        if (a.percent == null) return 1;
        if (b.percent == null) return -1;
        return a.percent - b.percent;
      })
      .map((target) => ({
        courseId: target.courseId,
        title: target.title,
        percent: target.percent,
        score: target.score,
        maxScore: target.maxScore,
        appliedTenths: target.appliedTenths,
        headroomTenths: target.headroomTenths,
      }));

    const hasWalletGrant = walletGrants.length > 0;
    const totalGrantTenths = overview.grants.reduce(
      (sum, grant) => sum + grant.totalTenths,
      0,
    );
    const usedTenths = Math.max(0, totalGrantTenths - overview.walletTenths);
    const usedPercent =
      totalGrantTenths > 0
        ? Math.min(100, Math.round((usedTenths / totalGrantTenths) * 100))
        : 0;
    const walletPoints = overview.walletTenths / 10;
    const appliedPoints = overview.appliedTenths / 10;

    const historyRows = overview.grants.map((grant) => ({
      id: grant.id,
      courseTitle: grant.courseTitle,
      totalTenths: grant.totalTenths,
      allocatedTenths: grant.allocatedTenths,
      remainingTenths: grant.remainingTenths,
      reason: grant.reason,
      awardedByName: grant.awardedByName,
      createdAt: fmtDateTime(grant.createdAt),
      allocations: grant.allocations.map((allocation) => ({
        id: allocation.id,
        courseTitle: allocation.courseTitle,
        points: allocation.points,
      })),
    }));

    return (
      <div className="fb-dash fb-award">
        <FbMotion variant="dashboard" />
        <header className="fb-dash-head" data-fb-reveal>
          <div>
            <div className="fb-chips">
              {hasWalletGrant ? (
                <span className="fb-chip live">
                  <i />
                  {dictionary.grdWalletBalance}
                </span>
              ) : null}
              {user.group?.name ? (
                <span className="fb-chip blue">{user.group.name}</span>
              ) : null}
              <span className="fb-chip">{fmtDate(new Date())}</span>
            </div>
            <h1 className="fb-greet">
              {dictionary.grdMyBonusPoints}
              <span className="fb-serif">.</span>
            </h1>
            <div className="fb-subline">
              <span>
                +{formatPoints(walletPoints)} {dictionary.grdBall}
              </span>
              <i />
              <span>
                {translate(locale, "grdRecordsCount", { count: overview.grants.length })}
              </span>
              <i />
              <span>
                {targets.length} {dictionary.grdStatSubjects.toLowerCase()}
              </span>
            </div>
            <nav className="fb-quick" aria-label={dictionary.dashQuickActions}>
              <span className="fb-quick-label">{dictionary.dashQuickActions}</span>
              <Link href="/grades">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20V11M10 20V5M16 20v-6M22 20H2" />
                </svg>
                {dictionary.navGradesStudent}
              </Link>
              <Link href="/gpa">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
                </svg>
                {dictionary.navGpa}
              </Link>
              <Link href="/transcript">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v12M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                {dictionary.navTranscript}
              </Link>
            </nav>
          </div>
          <div className="fb-head-actions">
            <Link className="fb-btn" href="/grades">
              {dictionary.grdGradesTitle}
            </Link>
            {hasWalletGrant ? (
              <a className="fb-btn primary" href="#allocate">
                <WalletIcon />
                {dictionary.grdBonusAllocateAction}
              </a>
            ) : null}
          </div>
        </header>

        {hasWalletGrant ? (
          <section className="fb-focus" data-fb-reveal data-fb-delay="80">
            <div>
              <div className="fb-focus-eyebrow">
                <i />
                {dictionary.grdWalletBalance}
              </div>
              <h2>
                +{formatPoints(walletPoints)} {dictionary.grdBall}
              </h2>
              <div className="fb-focus-meta">
                <span>
                  {translate(locale, "grdBonusWalletSubtitle", {
                    points: formatPoints(walletPoints),
                  })}
                </span>
              </div>
            </div>
            <div className="fb-focus-progress">
              <div className="fb-fp-top">
                <span>{dictionary.grdBonusAllocations}</span>
                <b>
                  {formatPoints(usedTenths / 10)} / {formatPoints(totalGrantTenths / 10)}{" "}
                  {dictionary.grdBall}
                </b>
              </div>
              <div className="fb-fp-track">
                <i style={{ width: `${usedPercent}%` }} />
              </div>
              <div className="fb-fp-bot">
                {translate(locale, "grdBonusUsedOf", {
                  used: formatPoints(usedTenths / 10),
                  total: formatPoints(totalGrantTenths / 10),
                })}
              </div>
            </div>
            <div className="fb-focus-join">
              <span className="fb-zoom">
                <i />
                {dictionary.grdBonusWalletBadge}
              </span>
              <a className="fb-join-btn" href="#allocate">
                <WalletIcon />
                {dictionary.grdBonusAllocateAction}
              </a>
            </div>
          </section>
        ) : (
          <section className="fb-focus no-lesson" data-fb-reveal data-fb-delay="80">
            <div>
              <div className="fb-focus-eyebrow">
                <i />
                {dictionary.grdWalletBalance}
              </div>
              <h2>{dictionary.grdBonusWalletEmpty}</h2>
              <div className="fb-focus-meta">
                <span>{dictionary.grdBonusWalletEmptyDesc}</span>
              </div>
            </div>
            <div className="fb-focus-join">
              <Link className="fb-join-btn" href="/grades">
                {dictionary.navGradesStudent}
              </Link>
            </div>
          </section>
        )}

        <section className="fb-kpis">
          <div className="fb-kpi" data-fb-reveal data-fb-delay="120">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdWalletBalance}</span>
              <span className="fb-kpi-ico">
                <WalletIcon />
              </span>
            </div>
            <div className="fb-kpi-val">
              <b data-fb-count={walletPoints}>{formatPoints(walletPoints)}</b>
              <span>{dictionary.grdBall}</span>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusWalletBadge}</div>
            <div className="fb-kbar" aria-hidden="true">
              <i style={{ width: `${hasWalletGrant ? usedPercent : 0}%` }} />
            </div>
          </div>

          <div className="fb-kpi" data-fb-reveal data-fb-delay="160">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdAppliedBonus}</span>
              <span className="fb-kpi-ico">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 11l3 3 8-8" />
                  <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                </svg>
              </span>
            </div>
            <div className="fb-kpi-val">
              <b data-fb-count={appliedPoints}>{formatPoints(appliedPoints)}</b>
              <span>{dictionary.grdBall}</span>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusToScoreChip}</div>
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
              <b data-fb-count={overview.grants.length}>{overview.grants.length}</b>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusHistoryTitle}</div>
          </div>

          <div className="fb-kpi" data-fb-reveal data-fb-delay="240">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdStatSubjects}</span>
              <span className="fb-kpi-ico">
                <BookIcon />
              </span>
            </div>
            <div className="fb-kpi-val">
              <b data-fb-count={targets.length}>{targets.length}</b>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusChooseSubject}</div>
            <div className="fb-kbar" aria-hidden="true">
              <i
                style={{
                  width: `${
                    overview.targets.length > 0
                      ? Math.round((targets.length / overview.targets.length) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </section>

        <div className="fb-award-stack" id="allocate">
          {hasWalletGrant ? (
            <BonusAllocator
              grants={walletGrants}
              targets={targets}
              walletTenths={overview.walletTenths}
            />
          ) : null}
          <BonusGrantHistory rows={historyRows} />
        </div>
      </div>
    );
  }

  const isTeacher = user.role === "TEACHER";
  const isRector = user.role === "REKTOR";
  const canAward = isTeacher || isRector;

  const courses = isTeacher
    ? await prisma.course.findMany({
        where: { teacherId: user.id },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      })
    : [];

  const courseIds = courses.map((course) => course.id);

  // Rektor istalgan talabaga ball beradi; o'qituvchi faqat o'z fanidagilarga.
  const students = isTeacher
    ? courseIds.length > 0
      ? await prisma.user.findMany({
          where: {
            role: "STUDENT",
            isActive: true,
            enrollments: { some: { courseId: { in: courseIds }, status: "ACTIVE" } },
          },
          select: { id: true, name: true, group: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: 400,
        })
      : []
    : isRector
      ? await prisma.user.findMany({
          where: {
            role: "STUDENT",
            isActive: true,
            enrollments: { some: { status: "ACTIVE" } },
          },
          select: { id: true, name: true, group: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: 1000,
        })
      : [];

  const ledger = await prisma.bonusPoint.findMany({
    where: { awardedById: user.id },
    select: {
      id: true,
      tenths: true,
      reason: true,
      createdAt: true,
      courseId: true,
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      course: { select: { id: true, title: true } },
      awardedBy: { select: { name: true } },
      allocations: {
        select: { id: true, tenths: true, course: { select: { title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalTenths = ledger.reduce((sum, row) => sum + row.tenths, 0);
  const totalPoints = totalTenths / 10;
  const uniqueStudents = new Set(ledger.map((row) => row.student.id)).size;
  const todayKey = fmtDate(new Date());
  const todayCount = ledger.filter((row) => fmtDate(row.createdAt) === todayKey).length;
  const coverage =
    students.length > 0 ? Math.min(100, Math.round((uniqueStudents / students.length) * 100)) : 0;
  const latest = ledger[0] ?? null;

  const roleLabels: Record<string, string> = {
    REKTOR: dictionary.roleRector,
    PRO_RECTOR: dictionary.roleProRector,
    TEACHER: dictionary.roleTeacher,
    ADMIN: dictionary.roleAdmin,
  };
  const roleLabel = roleLabels[user.role] ?? dictionary.grdTeacherPlain;

  return (
    <div className="fb-dash fb-award">
      <FbMotion variant="dashboard" />
      <header className="fb-dash-head" data-fb-reveal>
        <div>
          <div className="fb-chips">
            {isRector ? (
              <span className="fb-chip live">
                <i />
                {dictionary.grdRectorUnlimited}
              </span>
            ) : (
              <span className="fb-chip blue">{roleLabel}</span>
            )}
            {isRector ? <span className="fb-chip blue">{roleLabel}</span> : null}
            <span className="fb-chip">{fmtDate(new Date())}</span>
          </div>
          <h1 className="fb-greet">
            {dictionary.grdBonusPoints}
            <span className="fb-serif">.</span>
          </h1>
          <div className="fb-subline">
            <span>
              +{formatPoints(totalPoints)} {dictionary.grdBall}
            </span>
            <i />
            <span>{translate(locale, "grdNStudents", { count: uniqueStudents })}</span>
            <i />
            <span>{translate(locale, "grdRecordsCount", { count: ledger.length })}</span>
          </div>
          <nav className="fb-quick" aria-label={dictionary.dashQuickActions}>
            <span className="fb-quick-label">{dictionary.dashQuickActions}</span>
            {isRector ? (
              <Link href="/credit-awards">
                <DiamondIcon />
                {dictionary.grdGiveCredit}
              </Link>
            ) : null}
            <Link href="/grades">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 20V11M10 20V5M16 20v-6M22 20H2" />
              </svg>
              {dictionary.navGradesStaff}
            </Link>
            <Link href="/monitoring">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 20h18" />
                <path d="M6 20V9M11 20V4M16 20v-7M21 20v-4" />
              </svg>
              {dictionary.navMonitoring}
            </Link>
          </nav>
        </div>
        <div className="fb-head-actions">
          <Link className="fb-btn" href="/dashboard">
            {dictionary.navDashboard}
          </Link>
          {canAward ? (
            <a className="fb-btn primary" href="#award-form">
              <SparkIcon />
              {dictionary.grdGiveBonus}
            </a>
          ) : null}
        </div>
      </header>

      {latest ? (
        <section className="fb-focus" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {dictionary.grdStatTotalPoints}
            </div>
            <h2>
              +{formatPoints(latest.tenths / 10)} {dictionary.grdBall} ·{" "}
              {latest.student.name}
            </h2>
            <div className="fb-focus-meta">
              <b>{latest.student.group?.name ?? dictionary.grdNoGroup}</b>
              <i />
              <span>{latest.course?.title ?? dictionary.grdBonusWallet}</span>
              <i />
              <span>{fmtDateTime(latest.createdAt)}</span>
            </div>
          </div>
          <div className="fb-focus-progress">
            <div className="fb-fp-top">
              <span>{dictionary.grdStudents}</span>
              <b>
                {uniqueStudents} / {students.length}
              </b>
            </div>
            <div className="fb-fp-track">
              <i style={{ width: `${coverage}%` }} />
            </div>
            <div className="fb-fp-bot">
              {translate(locale, "grdNStudents", { count: uniqueStudents })}
            </div>
          </div>
          <div className="fb-focus-join">
            <span className="fb-zoom">
              <i />
              {isRector ? dictionary.grdRectorUnlimited : dictionary.grdTeacherPanel}
            </span>
            {canAward ? (
              <a className="fb-join-btn" href="#award-form">
                <SparkIcon />
                {dictionary.grdGiveBonus}
              </a>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="fb-focus no-lesson" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {dictionary.grdStatTotalPoints}
            </div>
            <h2>{dictionary.grdNoRecordsYet}</h2>
            <div className="fb-focus-meta">
              <span>{dictionary.grdNoBonusPointsDesc}</span>
            </div>
          </div>
          {canAward ? (
            <div className="fb-focus-join">
              <a className="fb-join-btn" href="#award-form">
                {dictionary.grdGiveBonus}
              </a>
            </div>
          ) : null}
        </section>
      )}

      <section className="fb-kpis">
        <div className="fb-kpi" data-fb-reveal data-fb-delay="120">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdStatTotalPoints}</span>
            <span className="fb-kpi-ico">
              <SparkIcon />
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={totalPoints}>{formatPoints(totalPoints)}</b>
            <span>{dictionary.grdBall}</span>
          </div>
          <div className="fb-kpi-foot">
            {translate(locale, "grdBonusPlus", { points: formatPoints(totalPoints) })}
          </div>
          <div className="fb-kbar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, totalPoints)}%` }} />
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
          <div className="fb-kpi-foot">{translate(locale, "grdNStudents", { count: uniqueStudents })}</div>
          <div className="fb-kbar" aria-hidden="true">
            <i style={{ width: `${coverage}%` }} />
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
          <div className="fb-kpi-foot">{translate(locale, "grdRecordsCount", { count: ledger.length })}</div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="240">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdGroupToday}</span>
            <span className="fb-kpi-ico">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
          </div>
          <div className="fb-kpi-val">
            <b data-fb-count={todayCount}>{todayCount}</b>
            <span>{dictionary.grdBall}</span>
          </div>
          <div className="fb-kpi-foot">
            {translate(locale, "grdRecordsCount", { count: todayCount })}
          </div>
        </div>
      </section>

      <div className="fb-award-grid" id="award-form">
        <div className="min-w-0">
          {canAward ? (
            <BonusAwardForm
              courses={courses}
              students={students.map((student) => ({
                id: student.id,
                name: student.name,
                groupName: student.group?.name ?? null,
              }))}
              minTenths={isRector ? BONUS_RECTOR_MIN_TENTHS : BONUS_MIN_TENTHS}
              maxTenths={isRector ? undefined : BONUS_MAX_TENTHS}
              rectorMode={isRector}
            />
          ) : (
            <section className="fb-card">
              <div className="fb-card-head">
                <div className="fb-head-txt">
                  <h3>{dictionary.grdGivenBonusPoints}</h3>
                  <span className="fb-tagline">{dictionary.grdBonusPoints}</span>
                </div>
              </div>
              <div className="fb-empty-box">
                <span className="fb-ava">
                  <SparkIcon />
                </span>
                <b>{dictionary.grdNoBonusPoints}</b>
                <p>{dictionary.grdNoBonusPointsDesc}</p>
              </div>
            </section>
          )}
        </div>

        <div className="min-w-0">
          <BonusLedger
            rows={ledger.map((row) => {
              const allocatedTenths = row.allocations.reduce(
                (sum, allocation) => sum + allocation.tenths,
                0,
              );
              return {
                id: row.id,
                studentName: row.student.name,
                groupName: row.student.group?.name ?? null,
                courseTitle: row.course?.title ?? null,
                points: row.tenths / 10,
                remainingPoints:
                  row.courseId === null
                    ? Math.max(0, row.tenths - allocatedTenths) / 10
                    : 0,
                allocations: row.allocations.map((allocation) => ({
                  id: allocation.id,
                  courseTitle: allocation.course.title,
                  points: allocation.tenths / 10,
                })),
                reason: row.reason,
                awardedByName: row.awardedBy.name,
                createdAt: fmtDateTime(row.createdAt),
              };
            })}
            showAwardedBy={isRector}
            title={isRector ? dictionary.grdRectorBonusLedger : undefined}
          />
        </div>
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
