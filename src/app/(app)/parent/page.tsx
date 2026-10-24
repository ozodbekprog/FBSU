import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate, type Locale } from "@/i18n";
import { getStudentAttendance } from "@/app/api/attendance/summary/data";
import { getStudentGpa } from "@/app/api/gpa/data";
import { getStudentAnalytics } from "@/app/(app)/dashboard/analytics";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { FbMotion } from "@/components/fb/fb-motion";
import { SLOT_TIMES } from "@/components/attendance/lesson-utils";
import { isoWeekday } from "@/components/schedule/week-utils";
import { ChildCards } from "@/components/parent/child-cards";
import { dayName } from "@/lib/utils";

type TodayLesson = {
  id: string;
  slot: number;
  subject: string;
  room: string | null;
  teacher: string | null;
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  );
}

function StarIcon() {
  return (
    <Svg>
      <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
    </Svg>
  );
}

function BookIcon() {
  return (
    <Svg>
      <path d="M4 19.4V5.6A2.6 2.6 0 0 1 6.6 3H20v16.6H6.6A2.6 2.6 0 0 0 4 22" />
      <path d="M4 19.4A2.6 2.6 0 0 1 6.6 16.8H20" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </Svg>
  );
}

function ChatIcon() {
  return (
    <Svg>
      <path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4.5 4V6A2.5 2.5 0 0 1 6 3.5h12.5A2.5 2.5 0 0 1 21 6z" />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </Svg>
  );
}

function dayMonth(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lessonDetails(teacher: string | null, room: string | null) {
  return [teacher, room].filter((value): value is string => value != null).join(" · ");
}

function Kpi({
  label,
  value,
  unit,
  foot,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  foot: ReactNode;
  icon: ReactNode;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div
      className="fb-kpi"
      data-kpi={accent ? "gpa" : undefined}
      data-fb-reveal
      data-fb-delay={delay}
    >
      <div className="fb-kpi-top">
        <span className="fb-kpi-label">{label}</span>
        <span className="fb-kpi-ico">{icon}</span>
      </div>
      <div className="fb-kpi-val">
        <b data-fb-count={typeof value === "number" ? value : undefined}>{value}</b>
        {unit ? <span>{unit}</span> : null}
      </div>
      <div className="fb-kpi-foot no-viz">{foot}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  note,
  delay,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  note?: ReactNode;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section className="fb-card" data-fb-reveal data-fb-delay={delay}>
      <div className="fb-card-head">
        <h3>{title}</h3>
        {subtitle ? <span className="fb-tagline">{subtitle}</span> : null}
      </div>
      {children}
      {note ? <p className="fb-panel-note">{note}</p> : null}
    </section>
  );
}

function ChartPanel({
  title,
  subtitle,
  note,
  empty,
  emptyTitle,
  emptyDescription,
  delay,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  note: ReactNode;
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <section className="fb-card" data-fb-reveal data-fb-delay={delay}>
      <div className="fb-card-head">
        <h3>{title}</h3>
        <span className="fb-tagline">{subtitle}</span>
      </div>
      {empty ? (
        <div className="fb-empty">
          <b>{emptyTitle}</b>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div className="fb-chart-body">{children}</div>
      )}
      <p className="fb-panel-note">{note}</p>
    </section>
  );
}

function Foot({ locale, time }: { locale: Locale; time: string }) {
  return (
    <div className="fb-foot-note">
      <span>FBSU LMS · Turin Polytechnic University in Tashkent</span>
      <span className="fb-foot-sync">
        <i />
        {translate(locale, "fbdStable", { time })}
      </span>
    </div>
  );
}

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await requireRole(["OTA_ONA"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { student: studentParam } = await searchParams;
  const now = new Date();
  const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayLabel = `${dayName(now.getDay(), locale)} · ${dayMonth(now)}`;
  const greeting =
    now.getHours() < 12
      ? dictionary.fbdGreetingMorning
      : now.getHours() < 18
        ? dictionary.fbdGreetingDay
        : dictionary.fbdGreetingEvening;

  const links = await prisma.parentLink.findMany({
    where: { parentId: user.id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          groupId: true,
          group: { select: { name: true } },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  if (links.length === 0) {
    return (
      <div className="fb-dash">
        <FbMotion variant="dashboard" />
        <header className="fb-dash-head" data-fb-reveal>
          <div>
            <div className="fb-chips">
              <span className="fb-chip blue">{dictionary.parentTitle}</span>
              <span className="fb-chip">{todayLabel}</span>
            </div>
            <h1 className="fb-greet">
              {greeting} <span className="fb-serif">{user.name}.</span>
            </h1>
            <div className="fb-subline">
              <span>{dictionary.parentSubtitle}</span>
            </div>
          </div>
        </header>
        <section className="fb-card" data-fb-reveal data-fb-delay="80">
          <div className="fb-empty">
            <b>{dictionary.parentNoLink}</b>
            <p>{dictionary.parentSubtitle}</p>
          </div>
        </section>
        <Foot locale={locale} time={timeLabel} />
      </div>
    );
  }

  const selected = links.find((link) => link.student.id === studentParam) ?? links[0];
  const student = selected.student;

  const [attendance, gpa, analytics, lessons, announcements] = await Promise.all([
    getStudentAttendance(student.id),
    getStudentGpa(student.id),
    getStudentAnalytics(student.id, locale),
    student.groupId
      ? prisma.scheduleEntry.findMany({
          where: { groupId: student.groupId, dayOfWeek: isoWeekday(now) },
          select: { id: true, slot: true, subject: true, room: true, teacher: true },
          orderBy: [{ slot: "asc" }, { id: "asc" }],
        })
      : Promise.resolve([] as TodayLesson[]),
    prisma.announcement.findMany({
      where: { courseId: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true },
    }),
  ]);

  const overall = attendance.overall;
  const risk = overall.total > 0 && !overall.eligible;
  const attended = overall.present + overall.late;
  const courseAttendance = new Map(attendance.courses.map((course) => [course.courseId, course]));
  const gradePoints = gpa.courses.map((course) => ({
    label: course.title.length > 18 ? `${course.title.slice(0, 17).trimEnd()}…` : course.title,
    value: course.percent,
  }));

  return (
    <div className="fb-dash">
      <FbMotion variant="dashboard" />

      <header className="fb-dash-head" data-fb-reveal>
        <div>
          <div className="fb-chips">
            <span className="fb-chip blue">{dictionary.parentTitle}</span>
            {student.group ? <span className="fb-chip">{student.group.name}</span> : null}
            <span className="fb-chip">{todayLabel}</span>
          </div>
          <h1 className="fb-greet">
            {greeting} <span className="fb-serif">{user.name}.</span>
          </h1>
          <div className="fb-subline">
            <span>{student.name}</span>
            <i />
            <span>
              {dictionary.parentAttendance} {overall.percent}%
            </span>
            <i />
            <span>GPA {gpa.gpa == null ? "—" : gpa.gpa.toFixed(2)}</span>
            <i />
            <span>
              {lessons.length} {dictionary.parentToday.toLowerCase()}
            </span>
          </div>
        </div>
        <div className="fb-head-actions">
          <Link className="fb-btn" href="/help">
            {dictionary.navHelp}
          </Link>
          <Link className="fb-btn primary" href="/messages">
            <ChatIcon />
            {dictionary.navMessages}
          </Link>
        </div>
      </header>

      {links.length > 1 ? (
        <section className="fb-card" data-fb-reveal data-fb-delay="60">
          <ChildCards links={links} selectedId={student.id} label={dictionary.parentSwitch} />
        </section>
      ) : null}

      <section className="fb-focus staff" data-fb-reveal data-fb-delay="80">
        <div>
          <div className="fb-focus-eyebrow">
            <i />
            {dictionary.parentToday} · {todayLabel}
          </div>
          <h2>{risk ? dictionary.parentRiskLow : dictionary.parentToday}</h2>
          <div className="fb-focus-meta">
            <b>{student.name}</b>
            {student.group ? (
              <>
                <i />
                <span>{student.group.name}</span>
              </>
            ) : null}
            <i />
            <span>
              {dictionary.parentEligible}: {overall.eligible ? "HA" : "YO'Q"}
            </span>
          </div>
          <div className="fb-focus-stats">
            <span className="fb-focus-stat">
              <b>{overall.percent}%</b>
              {dictionary.parentAttendance}
            </span>
            <span className="fb-focus-stat">
              <b>{gpa.gpa == null ? "—" : gpa.gpa.toFixed(2)}</b>
              {dictionary.parentGpa}
            </span>
            <span className="fb-focus-stat">
              <b>{gpa.courses.length}</b>
              {dictionary.dashStatCourses}
            </span>
            <span className="fb-focus-stat">
              <b>{lessons.length}</b>
              {dictionary.parentToday}
            </span>
          </div>
        </div>
        <div className="fb-focus-side">
          <div className="fb-focus-progress">
            <div className="fb-fp-top">
              <span>{dictionary.parentAttendance}</span>
              <b>
                {attended} / {overall.total}
              </b>
            </div>
            <div className="fb-fp-track">
              <i style={{ width: `${Math.max(0, Math.min(100, overall.percent))}%` }} />
            </div>
            <div className="fb-fp-bot">
              {overall.total > 0 ? dictionary.parentEligible : dictionary.parentEmpty}
            </div>
          </div>
          <div className="fb-focus-join">
            <span className="fb-zoom">
              <i />
              {student.group?.name ?? dictionary.parentTitle}
            </span>
            <Link className="fb-join-btn" href="/messages">
              <ChatIcon />
              {dictionary.navMessages}
            </Link>
          </div>
        </div>
      </section>

      <section className="fb-kpis">
        <Kpi
          accent
          label={dictionary.parentAttendance}
          value={overall.percent}
          unit="%"
          foot={translate(locale, "fbdKpiAttendanceFoot", {
            attended,
            total: overall.total,
          })}
          icon={<ClockIcon />}
          delay={120}
        />
        <Kpi
          label={dictionary.parentGpa}
          value={gpa.gpa == null ? "—" : gpa.gpa.toFixed(2)}
          foot={translate(locale, "fbdKpiGpaFoot", {
            credits: gpa.totalCredits,
            graded: gpa.gradedCount,
          })}
          icon={<StarIcon />}
          delay={160}
        />
        <Kpi
          label={dictionary.dashStatCourses}
          value={gpa.courses.length}
          foot={translate(locale, "fbdKpiCreditsFoot", {
            credits: gpa.totalCredits,
            count: gpa.courses.length,
          })}
          icon={<BookIcon />}
          delay={200}
        />
        <Kpi
          label={dictionary.parentToday}
          value={lessons.length}
          foot={dayName(now.getDay(), locale)}
          icon={<CalendarIcon />}
          delay={240}
        />
      </section>

      <div className="fb-grid">
        <div className="fb-col">
          <Panel
            title={dictionary.parentToday}
            subtitle={dayName(now.getDay(), locale)}
            delay={160}
          >
            {lessons.length === 0 ? (
              <div className="fb-empty">
                <b>{dictionary.dashNoLessonsTodayTitle}</b>
                <p>{dictionary.dashNoLessonsTodayDesc}</p>
              </div>
            ) : (
              <div className="fb-list">
                {lessons.map((lesson) => (
                  <div className="fb-listrow" key={lesson.id}>
                    <div className="fb-listrow-main">
                      <b>{lesson.subject}</b>
                      <span>{lessonDetails(lesson.teacher, lesson.room) || "—"}</span>
                    </div>
                    <div className="fb-listrow-end">
                      <span className="fb-pill blue">
                        {SLOT_TIMES[lesson.slot]
                          ? `${lesson.slot}. ${SLOT_TIMES[lesson.slot]}`
                          : String(lesson.slot)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title={dictionary.dashStatCourses}
            subtitle={translate(locale, "dashCoursesCountSubtitle", { count: gpa.courses.length })}
            note={translate(locale, "fbdKpiCreditsFoot", {
              credits: gpa.totalCredits,
              count: gpa.courses.length,
            })}
            delay={200}
          >
            {gpa.courses.length === 0 ? (
              <div className="fb-empty">
                <b>{dictionary.parentEmpty}</b>
                <p>{dictionary.parentSubtitle}</p>
              </div>
            ) : (
              <div className="fb-table-wrap">
                <table className="fb-table">
                  <thead>
                    <tr>
                      <th>{dictionary.dashStatCourses}</th>
                      <th>{dictionary.parentAttendance}</th>
                      <th>{dictionary.fbdColGrade}</th>
                      <th>{dictionary.grdScore}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpa.courses.map((course) => {
                      const att = courseAttendance.get(course.courseId);
                      return (
                        <tr key={course.courseId}>
                          <td>
                            <b>{course.title}</b>
                          </td>
                          <td>{att && att.total > 0 ? `${att.percent}%` : "—"}</td>
                          <td>
                            {course.gradedCount > 0 ? (
                              <span className="fb-pill green">{course.letter}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{course.gradedCount > 0 ? course.points.toFixed(1) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="fb-col">
          <Panel
            title={dictionary.dashAttendanceDistTitle}
            subtitle={dictionary.parentAttendance}
            delay={180}
          >
            {analytics.attendanceTotal === 0 ? (
              <div className="fb-empty">
                <b>{dictionary.dashNoDataTitle}</b>
                <p>{dictionary.dashAttendanceDistEmpty}</p>
              </div>
            ) : (
              <div className="fb-chart-body">
                <DonutChart data={analytics.attendance} />
              </div>
            )}
            {risk ? (
              <div className="fb-alert">
                <div>
                  <b>{dictionary.parentWarnings}</b>
                  {dictionary.parentRiskLow}
                </div>
              </div>
            ) : (
              <p className="fb-panel-note">{dictionary.dashAttendanceDistNote}</p>
            )}
          </Panel>

          <Panel
            title={dictionary.dashCourseAttendanceTitle}
            subtitle={dictionary.parentAttendance}
            delay={220}
          >
            {analytics.courseAttendance.length === 0 ? (
              <div className="fb-empty">
                <b>{dictionary.dashNoDataTitle}</b>
                <p>{dictionary.dashCourseAttendanceEmpty}</p>
              </div>
            ) : (
              <div className="fb-chart-body">
                <BarChart data={analytics.courseAttendance} />
              </div>
            )}
            <p className="fb-panel-note">{dictionary.dashCourseAttendanceNote}</p>
          </Panel>
        </div>
      </div>

      <div className="fb-sechead" data-fb-reveal data-fb-delay="260">
        <div>
          <span className="fb-kicker">{dictionary.dashAnalyticsTitle}</span>
          <h2>{student.name}</h2>
          <p>{dictionary.parentSubtitle}</p>
        </div>
        <span className="fb-sechead-aside">{todayLabel}</span>
      </div>

      <div className="fb-grid even">
        <ChartPanel
          title={dictionary.dashGradeTrendTitle}
          subtitle={dictionary.dashLast14Days}
          note={dictionary.dashGradeTrendNote}
          empty={analytics.gradeTotal === 0}
          emptyTitle={dictionary.dashNoDataTitle}
          emptyDescription={dictionary.dashGradeTrendEmpty}
          delay={280}
        >
          <LineChart data={analytics.gradeTrend} />
        </ChartPanel>

        <ChartPanel
          title={dictionary.parentCourseGrades}
          subtitle={dictionary.parentGpa}
          note={dictionary.parentCourseGradesNote}
          empty={gradePoints.length === 0}
          emptyTitle={dictionary.dashNoDataTitle}
          emptyDescription={dictionary.parentCourseGradesEmpty}
          delay={320}
        >
          <BarChart data={gradePoints} />
        </ChartPanel>
      </div>

      <section className="fb-strip" data-fb-reveal data-fb-delay="340">
        <span className="fb-strip-label">
          <i />
          {dictionary.fbdAnnouncements}
        </span>
        <div className="fb-strip-items">
          {announcements.length === 0 ? (
            <span className="fb-strip-empty">{dictionary.fbdAnnouncementsEmpty}</span>
          ) : (
            announcements.map((announcement) => (
              <span className="fb-strip-item" key={announcement.id}>
                <b>{announcement.title}</b>
                {announcement.body.replace(/\s+/g, " ").slice(0, 90)}
              </span>
            ))
          )}
        </div>
        <Link
          className="fb-strip-arrow"
          href="/messages"
          aria-label={dictionary.fbdAnnouncements}
        >
          <ArrowIcon />
        </Link>
      </section>

      <Foot locale={locale} time={timeLabel} />
    </div>
  );
}
