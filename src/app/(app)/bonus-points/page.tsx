import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BonusAwardForm } from "@/components/gpa/bonus-award-form";
import { BonusLedger } from "@/components/gpa/bonus-ledger";
import { FbMotion } from "@/components/fb/fb-motion";
import {
  BONUS_MAX_TENTHS,
  BONUS_MIN_TENTHS,
  COURSE_POINTS_MAX,
  COURSE_POINTS_PASS,
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
    const latest = overview.grants[0] ?? null;
    const subjects = new Set(overview.grants.map((grant) => grant.courseId)).size;

    return (
      <div className="fb-dash fb-award">
        <FbMotion variant="dashboard" />
        <header className="fb-dash-head" data-fb-reveal>
          <div>
            <div className="fb-chips">
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
                +{formatPoints(overview.totalPoints)} {dictionary.grdBall}
              </span>
              <i />
              <span>
                {translate(locale, "grdRecordsCount", { count: overview.grants.length })}
              </span>
              <i />
              <span>{translate(locale, "grdBonusSubjectCount", { count: subjects })}</span>
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
          </div>
        </header>

        <section className="fb-focus" data-fb-reveal data-fb-delay="80">
          <div>
            <div className="fb-focus-eyebrow">
              <i />
              {dictionary.grdPassMark}
            </div>
            <h2>
              {COURSE_POINTS_PASS} / {COURSE_POINTS_MAX}
            </h2>
            <div className="fb-focus-meta">
              <span>{dictionary.grdCourseRule}</span>
            </div>
          </div>
          <div className="fb-focus-progress">
            <div className="fb-fp-top">
              <span>{dictionary.grdPoints30}</span>
              <b>
                {COURSE_POINTS_PASS} / {COURSE_POINTS_MAX}
              </b>
            </div>
            <div className="fb-fp-track">
              <i
                style={{
                  width: `${Math.round((COURSE_POINTS_PASS / COURSE_POINTS_MAX) * 100)}%`,
                }}
              />
            </div>
            <div className="fb-fp-bot">{dictionary.grdCreditOnlyOnPass}</div>
          </div>
          <div className="fb-focus-join">
            <span className="fb-zoom">
              <i />
              {dictionary.grdBonusTeacherBadge}
            </span>
            <Link className="fb-join-btn" href="/grades">
              {dictionary.navGradesStudent}
            </Link>
          </div>
        </section>

        <section className="fb-kpis">
          <div className="fb-kpi" data-fb-reveal data-fb-delay="120">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdStatTotalPoints}</span>
              <span className="fb-kpi-ico">
                <SparkIcon />
              </span>
            </div>
            <div className="fb-kpi-val">
              <b data-fb-count={overview.totalPoints}>
                {formatPoints(overview.totalPoints)}
              </b>
              <span>{dictionary.grdBall}</span>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusToScoreChip}</div>
          </div>

          <div className="fb-kpi" data-fb-reveal data-fb-delay="160">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdStatRecords}</span>
              <span className="fb-kpi-ico">
                <RecordsIcon />
              </span>
            </div>
            <div className="fb-kpi-val">
              <b data-fb-count={overview.grants.length}>{overview.grants.length}</b>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusHistoryTitle}</div>
          </div>

          <div className="fb-kpi" data-fb-reveal data-fb-delay="200">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdStatSubjects}</span>
              <span className="fb-kpi-ico">
                <BookIcon />
              </span>
            </div>
            <div className="fb-kpi-val">
              <b data-fb-count={subjects}>{subjects}</b>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdBonusChooseSubject}</div>
          </div>

          <div className="fb-kpi" data-fb-reveal data-fb-delay="240">
            <div className="fb-kpi-top">
              <span className="fb-kpi-label">{dictionary.grdPoints30}</span>
              <span className="fb-kpi-ico">
                <TargetIcon />
              </span>
            </div>
            <div className="fb-kpi-val">
              <b>{COURSE_POINTS_PASS}</b>
              <span>/ {COURSE_POINTS_MAX}</span>
            </div>
            <div className="fb-kpi-foot">{dictionary.grdPassMark}</div>
            <div className="fb-kbar" aria-hidden="true">
              <i
                style={{
                  width: `${Math.round((COURSE_POINTS_PASS / COURSE_POINTS_MAX) * 100)}%`,
                }}
              />
            </div>
          </div>
        </section>

        <div className="fb-award-stack">
          <section className="fb-card" data-fb-reveal data-fb-delay="260">
            <div className="fb-card-head">
              <div className="fb-head-txt">
                <h3>{dictionary.grdBonusHistoryTitle}</h3>
                <span className="fb-tagline">
                  {latest
                    ? `${latest.courseTitle} · ${fmtDateTime(latest.createdAt)}`
                    : dictionary.grdStudentBonusDesc}
                </span>
              </div>
              {overview.grants.length > 0 ? (
                <span className="fb-mini">
                  {translate(locale, "grdBonusPlus", {
                    points: formatPoints(overview.totalPoints),
                  })}
                </span>
              ) : null}
            </div>

            {overview.grants.length === 0 ? (
              <div className="fb-empty-box">
                <span className="fb-ava">
                  <SparkIcon />
                </span>
                <b>{dictionary.grdNoBonusPoints}</b>
                <p>{dictionary.grdNoBonusPointsDesc}</p>
              </div>
            ) : (
              <div className="fb-rows">
                {overview.grants.map((grant) => (
                  <div key={grant.id} className="fb-rowl">
                    <span className="fb-rowl-ava">
                      <BookIcon />
                    </span>

                    <div className="fb-rowl-main">
                      <div className="fb-rowl-name">
                        <span className="fb-rowl-nametxt">{grant.courseTitle}</span>
                        <span className="fb-mini">{grant.awardedByName}</span>
                      </div>
                      <div className="fb-rowl-sub">
                        <span>{fmtDateTime(grant.createdAt)}</span>
                        <i className="fb-dot" />
                        <span>{dictionary.grdCreditOnlyOnPass}</span>
                      </div>
                      <p className="fb-rowl-reason">{grant.reason}</p>
                    </div>

                    <div className="fb-rowl-right">
                      <p className="fb-amt">
                        +{formatPoints(grant.points)}
                        <small>{dictionary.grdBall}</small>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const courses = await prisma.course.findMany({
    where: { teacherId: user.id },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const courseIds = courses.map((course) => course.id);

  const students =
    courseIds.length > 0
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
      : [];

  const ledger = await prisma.bonusPoint.findMany({
    where: { awardedById: user.id, courseId: { not: null } },
    select: {
      id: true,
      tenths: true,
      reason: true,
      createdAt: true,
      courseId: true,
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      course: { select: { id: true, title: true } },
      awardedBy: { select: { name: true } },
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

  return (
    <div className="fb-dash fb-award">
      <FbMotion variant="dashboard" />
      <header className="fb-dash-head" data-fb-reveal>
        <div>
          <div className="fb-chips">
            <span className="fb-chip blue">{dictionary.roleTeacher}</span>
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
          <a className="fb-btn primary" href="#award-form">
            <SparkIcon />
            {dictionary.grdGiveBonus}
          </a>
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
              <span>{latest.course?.title ?? dictionary.grdSubject}</span>
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
              {dictionary.grdTeacherPanel}
            </span>
            <a className="fb-join-btn" href="#award-form">
              <SparkIcon />
              {dictionary.grdGiveBonus}
            </a>
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
          <div className="fb-focus-join">
            <a className="fb-join-btn" href="#award-form">
              {dictionary.grdGiveBonus}
            </a>
          </div>
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
              <UsersIcon />
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
            <i style={{ width: `${coverage}%` }} />
          </div>
        </div>

        <div className="fb-kpi" data-fb-reveal data-fb-delay="200">
          <div className="fb-kpi-top">
            <span className="fb-kpi-label">{dictionary.grdStatRecords}</span>
            <span className="fb-kpi-ico">
              <RecordsIcon />
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
            <span className="fb-kpi-label">{dictionary.grdGroupToday}</span>
            <span className="fb-kpi-ico">
              <ClockIcon />
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
          <BonusAwardForm
            courses={courses}
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              groupName: student.group?.name ?? null,
            }))}
            minTenths={BONUS_MIN_TENTHS}
            maxTenths={BONUS_MAX_TENTHS}
          />
        </div>

        <div className="min-w-0">
          <BonusLedger
            rows={ledger.map((row) => ({
              id: row.id,
              studentName: row.student.name,
              groupName: row.student.group?.name ?? null,
              courseTitle: row.course?.title ?? null,
              points: row.tenths / 10,
              reason: row.reason,
              awardedByName: row.awardedBy.name,
              createdAt: fmtDateTime(row.createdAt),
            }))}
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

function RecordsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M17 20c0-2.2-.6-4-1.7-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
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
