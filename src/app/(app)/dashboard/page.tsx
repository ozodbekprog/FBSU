import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { canViewSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { cn, dayName, fmtDate } from "@/lib/utils";
import { getAdminAnalytics, getTeacherAnalytics } from "./analytics";
import type { AdminAnalytics, TeacherAnalytics } from "./analytics";
import { salaryTotalsForMonth } from "@/lib/payroll";
import { getDictionary, getLocale, t as translate, type Dictionary, type Locale } from "@/i18n";
import { StudentHome } from "@/components/fb/student-home";
import { FbMotion } from "@/components/fb/fb-motion";
import { buildWorkloadData } from "@/components/workload/workload-data";
import type { WorkloadCourse, WorkloadSummary } from "@/components/workload/workload-data";
import { isValidFaceDescriptor } from "@/modules/attendance/face";
import {
  SLOT_TIMES,
  dateFromIso,
  matchCourseSlug,
  normalizeTeacherName,
  slotRange,
  todayIso,
} from "@/components/attendance/lesson-utils";
import type { CourseOption } from "@/components/attendance/lesson-utils";

type TodayLesson = {
  id: string;
  slot: number;
  subject: string;
  room: string | null;
  groupName: string;
  href: string | null;
  statusText: string;
  marked: boolean;
};

type QuickAction = {
  href: string;
  label: string;
  icon: ReactNode;
};

type FocusStat = { value: ReactNode; label: string };

const NUMBER = new Intl.NumberFormat("ru-RU");

const SALARY_TONE: Record<string, string> = {
  DRAFT: "",
  PENDING: "amber",
  APPROVED: "green",
  PAID: "blue",
};

function fmtNumber(value: number) {
  return NUMBER.format(value);
}

function minutesOf(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function dayMonth(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function salaryLabel(status: string, dict: Dictionary) {
  if (status === "DRAFT") return dict.payDraft;
  if (status === "PENDING") return dict.payPending;
  if (status === "APPROVED") return dict.payApproved;
  if (status === "PAID") return dict.payPaid;
  return status;
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <Svg>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Svg>
  );
}

function BookIcon() {
  return (
    <Svg>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

function ClipboardIcon() {
  return (
    <Svg>
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </Svg>
  );
}

function HelpIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.8v.3" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

function ChartIcon() {
  return (
    <Svg>
      <path d="M3 20V10" />
      <path d="M9 20V4" />
      <path d="M15 20v-6" />
      <path d="M21 20H3" />
    </Svg>
  );
}

function FileIcon() {
  return (
    <Svg>
      <path d="M14 3v5h5" />
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M9 13h6M9 17h4" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Svg>
  );
}

function WalletIcon() {
  return (
    <Svg>
      <path d="M3 7a2 2 0 0 1 2-2h13v4" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 13h2" />
    </Svg>
  );
}

function BuildingIcon() {
  return (
    <Svg>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M9 7h2M9 11h2M9 15h2M15 21v-8h4v8" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

function DoorIcon() {
  return (
    <Svg>
      <path d="M4 21h16" />
      <path d="M7 21V4h10v17" />
      <path d="M13.5 12h.01" />
    </Svg>
  );
}

function GearIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 4.6H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
    </Svg>
  );
}

function StaffHead({
  name,
  roleLabel,
  scopeLabel,
  now,
  locale,
  stats,
  actions,
}: {
  name: string;
  roleLabel: string;
  scopeLabel: string | null;
  now: Date;
  locale: Locale;
  stats: string[];
  actions: QuickAction[];
}) {
  const dict = getDictionary(locale);
  const greeting =
    now.getHours() < 12
      ? dict.fbdGreetingMorning
      : now.getHours() < 18
        ? dict.fbdGreetingDay
        : dict.fbdGreetingEvening;
  const [primary, secondary] = actions;

  return (
    <header className="fb-dash-head" data-fb-reveal>
      <div>
        <div className="fb-chips">
          <span className="fb-chip blue">{roleLabel}</span>
          {scopeLabel ? <span className="fb-chip">{scopeLabel}</span> : null}
          <span className="fb-chip">
            {dayName(now.getDay(), locale)} · {dayMonth(now)}
          </span>
        </div>
        <h1 className="fb-greet">
          {greeting} <span className="fb-serif">{name}.</span>
        </h1>
        <div className="fb-subline">
          {scopeLabel ? <span>{scopeLabel}</span> : null}
          {scopeLabel && stats.length > 0 ? <i /> : null}
          {stats.map((stat, index) => (
            <Fragment key={stat}>
              {index > 0 ? <i /> : null}
              <span>{stat}</span>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="fb-head-actions">
        {secondary ? (
          <Link className="fb-btn" href={secondary.href}>
            {secondary.icon}
            {secondary.label}
          </Link>
        ) : null}
        {primary ? (
          <Link className="fb-btn primary" href={primary.href}>
            {primary.icon}
            {primary.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function FocusJoin({
  chip,
  href,
  label,
  icon,
}: {
  chip: ReactNode;
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <>
      <span className="fb-zoom">
        <i />
        {chip}
      </span>
      <Link className="fb-join-btn" href={href}>
        {icon}
        {label}
      </Link>
    </>
  );
}

function StaffFocus({
  eyebrow,
  title,
  meta,
  stats,
  progress,
  side,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  stats?: FocusStat[];
  progress?: { top: string; right: string; pct: number; bottom: ReactNode };
  side: ReactNode;
}) {
  return (
    <section className="fb-focus staff" data-fb-reveal data-fb-delay="80">
      <div>
        <div className="fb-focus-eyebrow">
          <i />
          {eyebrow}
        </div>
        <h2>{title}</h2>
        {meta ? <div className="fb-focus-meta">{meta}</div> : null}
        {stats && stats.length > 0 ? (
          <div className="fb-focus-stats">
            {stats.map((stat, index) => (
              <span className="fb-focus-stat" key={index}>
                <b>{stat.value}</b>
                {stat.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="fb-focus-side">
        {progress ? (
          <div className="fb-focus-progress">
            <div className="fb-fp-top">
              <span>{progress.top}</span>
              <b>{progress.right}</b>
            </div>
            <div className="fb-fp-track">
              <i style={{ width: `${Math.max(0, Math.min(100, progress.pct))}%` }} />
            </div>
            <div className="fb-fp-bot">{progress.bottom}</div>
          </div>
        ) : null}
        <div className="fb-focus-join">{side}</div>
      </div>
    </section>
  );
}

function StaffKpi({
  label,
  value,
  unit,
  foot,
  icon,
  href,
  accent,
  delay,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  foot: ReactNode;
  icon: ReactNode;
  href?: string;
  accent?: boolean;
  delay: number;
}) {
  const body = (
    <>
      <div className="fb-kpi-top">
        <span className="fb-kpi-label">{label}</span>
        <span className="fb-kpi-ico">{icon}</span>
      </div>
      <div className="fb-kpi-val">
        <b data-fb-count={typeof value === "number" ? value : undefined}>{value}</b>
        {unit ? <span>{unit}</span> : null}
      </div>
      <div className="fb-kpi-foot no-viz">{foot}</div>
    </>
  );

  if (!href) {
    return (
      <div className="fb-kpi" data-kpi={accent ? "gpa" : undefined} data-fb-reveal data-fb-delay={delay}>
        {body}
      </div>
    );
  }

  return (
    <Link
      className="fb-kpi"
      data-kpi={accent ? "gpa" : undefined}
      data-fb-reveal
      data-fb-delay={delay}
      href={href}
    >
      {body}
    </Link>
  );
}

function StaffPanel({
  title,
  subtitle,
  action,
  note,
  delay = 0,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: { href: string; label: string };
  note?: ReactNode;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section className="fb-card" data-fb-reveal data-fb-delay={delay}>
      <div className="fb-card-head">
        <h3>{title}</h3>
        {subtitle ? <span className="fb-tagline">{subtitle}</span> : null}
        {action ? (
          <Link className="fb-more" href={action.href}>
            {action.label}
            <ArrowIcon />
          </Link>
        ) : null}
      </div>
      {children}
      {note ? <p className="fb-panel-note">{note}</p> : null}
    </section>
  );
}

function StaffChart({
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
  subtitle: string;
  note: string;
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
        <>
          <div className="fb-chart-body">{children}</div>
          <p className="fb-panel-note">{note}</p>
        </>
      )}
    </section>
  );
}

function ActionTiles({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="fb-tiles">
      {actions.map((action) => (
        <Link key={action.href} className="fb-tile" href={action.href}>
          <span className="fb-tile-ico">{action.icon}</span>
          <span className="fb-tile-main">
            <b>{action.label}</b>
          </span>
        </Link>
      ))}
    </div>
  );
}

function StaffStrip({
  announcements,
  dict,
}: {
  announcements: { id: string; title: string; body: string }[];
  dict: Dictionary;
}) {
  return (
    <section className="fb-strip" data-fb-reveal data-fb-delay="340">
      <span className="fb-strip-label">
        <i />
        {dict.fbdAnnouncements}
      </span>
      <div className="fb-strip-items">
        {announcements.length === 0 ? (
          <span className="fb-strip-empty">{dict.fbdAnnouncementsEmpty}</span>
        ) : (
          announcements.map((announcement) => (
            <span className="fb-strip-item" key={announcement.id}>
              <b>{announcement.title}</b>
              {announcement.body.replace(/\s+/g, " ").slice(0, 90)}
            </span>
          ))
        )}
      </div>
      <Link className="fb-strip-arrow" href="/messages" aria-label={dict.fbdAnnouncements}>
        <ArrowIcon />
      </Link>
    </section>
  );
}

function StaffFoot({ locale, time }: { locale: Locale; time: string }) {
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

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "OTA_ONA") redirect("/parent");
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const now = new Date();
  const roleLabel =
    user.role === "ADMIN"
      ? dict.dashRoleAdminPanel
      : user.role === "REKTOR"
        ? dict.roleRector
        : user.role === "PRO_RECTOR"
          ? dict.roleProRector
          : user.role === "DEKAN"
            ? dict.roleDean
            : user.role === "KAFEDRA_MUDIRI"
              ? dict.roleHead
              : user.role === "REGISTRAR"
                ? dict.roleRegistrar
                : user.role === "BUXGALTER"
                  ? dict.payRoleBuxgalter
                  : user.role === "TYUTOR"
                    ? dict.roleTutor
                    : user.role === "XODIM"
                      ? dict.roleStaff
                      : user.role === "TEACHER"
                        ? dict.dashRoleTeacherPanel
                        : translate(locale, "dashRoleGroup", {
                            group: user.group?.name ?? dict.dashRoleStudent,
                          });
  const scopeLabel =
    user.role === "DEKAN"
      ? user.faculty?.name ?? null
      : user.role === "KAFEDRA_MUDIRI" || user.role === "TEACHER"
        ? user.department?.name ?? user.faculty?.name ?? null
        : user.role === "XODIM" || user.role === "BUXGALTER"
          ? user.department?.name ?? null
          : user.role === "TYUTOR"
            ? user.group?.name ?? null
            : null;
  const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const announcements =
    user.role === "STUDENT"
      ? []
      : await prisma.announcement.findMany({
          where: { courseId: null },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, title: true, body: true },
        });

  if (user.role === "XODIM") {
    const [rooms, bookings] = await Promise.all([
      prisma.room.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, building: true, capacity: true },
      }),
      prisma.roomBooking.findMany({
        where: { date: dateFromIso(todayIso()), status: "ACTIVE" },
        orderBy: { slot: "asc" },
        select: {
          id: true,
          roomName: true,
          slot: true,
          purpose: true,
          userId: true,
          user: { select: { name: true } },
        },
      }),
    ]);
    const busyRooms = new Set(bookings.map((booking) => booking.roomName.toLowerCase()));
    const freeRooms = rooms.filter((room) => !busyRooms.has(room.name.toLowerCase()));
    const myBookings = bookings.filter((booking) => booking.userId === user.id);
    const actions: QuickAction[] = [
      { href: "/rooms", label: dict.navRooms, icon: <DoorIcon /> },
      { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
      { href: "/settings", label: dict.navSettings, icon: <GearIcon /> },
      { href: "/help", label: dict.navHelp, icon: <HelpIcon /> },
    ];
    const focusTitle =
      rooms.length === 0
        ? dict.fbdRoomsEmpty
        : freeRooms.length > 0
          ? translate(locale, "fbdFreeRoomsTitle", { count: freeRooms.length })
          : dict.fbdAllRoomsBusy;
    const freePct = rooms.length > 0 ? Math.round((freeRooms.length / rooms.length) * 100) : 0;

    return (
      <div className="fb-dash">
        <FbMotion variant="dashboard" />
        <StaffHead
          name={user.name}
          roleLabel={roleLabel}
          scopeLabel={scopeLabel}
          now={now}
          locale={locale}
          stats={[
            translate(locale, "fbdRoomsTag", { count: rooms.length }),
            translate(locale, "fbdBookingsTag", { count: bookings.length }),
          ]}
          actions={actions}
        />

        <StaffFocus
          eyebrow={`${dict.fbdFocusToday} · ${dayName(now.getDay(), locale)}, ${dayMonth(now)}`}
          title={focusTitle}
          meta={
            <>
              <b>{roleLabel}</b>
              <i />
              <span>{dict.fbdRoomsSub}</span>
              <i />
              <span>{bookings.length > 0 ? dict.fbdBookingsTitle : dict.fbdBookingEmpty}</span>
            </>
          }
          stats={[
            { value: rooms.length, label: dict.navRooms },
            { value: bookings.length, label: dict.fbdBookingsLabel },
            { value: freeRooms.length, label: dict.fbdFreeLabel },
          ]}
          progress={{
            top: dict.fbdRoomsTitle,
            right: `${freeRooms.length} / ${rooms.length}`,
            pct: freePct,
            bottom: dict.fbdRoomsSub,
          }}
          side={
            <FocusJoin
              chip={dict.fbdFocusToday}
              href="/rooms"
              label={dict.navRooms}
              icon={<DoorIcon />}
            />
          }
        />

        <section className="fb-kpis">
          <StaffKpi
            accent
            href="/rooms"
            label={dict.navRooms}
            value={rooms.length}
            foot={dict.fbdRoomsSub}
            icon={<DoorIcon />}
            delay={120}
          />
          <StaffKpi
            href="/rooms"
            label={dict.fbdBookingsTitle}
            value={bookings.length}
            foot={dict.fbdBookingsSub}
            icon={<CalendarIcon />}
            delay={160}
          />
          <StaffKpi
            href="/rooms"
            label={dict.fbdMyBookingsFoot}
            value={myBookings.length}
            foot={dict.fbdFocusToday}
            icon={<CheckIcon />}
            delay={200}
          />
          <StaffKpi
            href="/rooms"
            label={dict.fbdFreeLabel}
            value={freeRooms.length}
            foot={dict.fbdRoomsSub}
            icon={<BuildingIcon />}
            delay={240}
          />
        </section>

        <div className="fb-grid">
          <div className="fb-col">
            <StaffPanel
              title={dict.fbdBookingsTitle}
              subtitle={translate(locale, "fbdBookingsTag", { count: bookings.length })}
              action={{ href: "/rooms", label: dict.fbdCardAll }}
              delay={160}
            >
              {bookings.length === 0 ? (
                <div className="fb-empty">
                  <b>{dict.fbdBookingEmpty}</b>
                  <p>{dict.fbdBookingEmptyDesc}</p>
                </div>
              ) : (
                <div className="fb-list">
                  {bookings.slice(0, 6).map((booking) => (
                    <div className="fb-listrow" key={booking.id}>
                      <div className="fb-listrow-main">
                        <b>{booking.roomName}</b>
                        <span>
                          {booking.purpose || "—"} · {booking.user.name}
                        </span>
                      </div>
                      <div className="fb-listrow-end">
                        <span className="fb-pill blue">
                          {translate(locale, "fbdSlotShort", { slot: booking.slot })}
                        </span>
                        <span className="fb-listrow-val">{SLOT_TIMES[booking.slot] ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StaffPanel>

            <StaffPanel title={dict.dashQuickActions} delay={200}>
              <ActionTiles actions={actions} />
            </StaffPanel>
          </div>

          <div className="fb-col">
            <StaffPanel
              title={dict.navRooms}
              subtitle={dict.fbdRoomsSub}
              action={{ href: "/rooms", label: dict.fbdCardAll }}
              delay={220}
            >
              {rooms.length === 0 ? (
                <div className="fb-empty">
                  <b>{dict.fbdRoomsEmpty}</b>
                  <p>{dict.fbdBookingEmptyDesc}</p>
                </div>
              ) : (
                <div className="fb-list">
                  {rooms.slice(0, 6).map((room) => {
                    const busy = busyRooms.has(room.name.toLowerCase());
                    const detail = [
                      room.building,
                      room.capacity != null
                        ? translate(locale, "fbdCapacity", { count: room.capacity })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div className="fb-listrow" key={room.id}>
                        <div className="fb-listrow-main">
                          <b>{room.name}</b>
                          <span>{detail || "—"}</span>
                        </div>
                        <span className={cn("fb-pill", busy ? "amber" : "green")}>
                          {busy ? dict.fbdRoomBusy : dict.fbdRoomFree}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </StaffPanel>
          </div>
        </div>

        <StaffStrip announcements={announcements} dict={dict} />
        <StaffFoot locale={locale} time={timeLabel} />
      </div>
    );
  }

  if (user.role === "BUXGALTER") {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthKey = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
    const [records, totals, pending, staffCount] = await Promise.all([
      prisma.salaryRecord.findMany({
        where: { month },
        orderBy: [{ status: "asc" }, { total: "desc" }],
        take: 6,
        select: {
          id: true,
          total: true,
          status: true,
          baseAmount: true,
          bonusAmount: true,
          user: {
            select: {
              name: true,
              staffPosition: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      }),
      salaryTotalsForMonth(month),
      prisma.salaryRecord.count({ where: { month, status: "PENDING" } }),
      prisma.user.count({ where: { isActive: true, role: { not: "STUDENT" } } }),
    ]);
    const actions: QuickAction[] = [
      { href: "/payroll", label: dict.payTitle, icon: <WalletIcon /> },
      { href: "/calendar", label: dict.navCalendar, icon: <CalendarIcon /> },
      { href: "/help", label: dict.navHelp, icon: <HelpIcon /> },
    ];
    const approved = Math.max(0, totals.totalCount - pending);
    const approvedPct =
      totals.totalCount > 0 ? Math.round((approved / totals.totalCount) * 100) : 0;

    return (
      <div className="fb-dash">
        <FbMotion variant="dashboard" />
        <StaffHead
          name={user.name}
          roleLabel={roleLabel}
          scopeLabel={scopeLabel}
          now={now}
          locale={locale}
          stats={[
            translate(locale, "fbdActiveStaff", { count: staffCount }),
            translate(locale, "fbdPayPendingTitle", { count: pending }),
          ]}
          actions={actions}
        />

        <StaffFocus
          eyebrow={`${dict.payMonth} · ${monthKey}`}
          title={
            pending > 0
              ? translate(locale, "fbdPayPendingTitle", { count: pending })
              : dict.fbdPayPendingNone
          }
          meta={
            <>
              <b>{translate(locale, "fbdActiveStaff", { count: staffCount })}</b>
              <i />
              <span>{dict.paySummarySubtitle}</span>
            </>
          }
          stats={[
            { value: fmtNumber(totals.grandTotal), label: dict.payGrandTotal },
            { value: totals.totalCount, label: dict.payStaffCount },
            { value: totals.byGroup.length, label: dict.payDepartment },
          ]}
          progress={{
            top: dict.fbdPayApproved,
            right: `${approved} / ${totals.totalCount}`,
            pct: approvedPct,
            bottom: `${dict.payMonth}: ${monthKey}`,
          }}
          side={
            <FocusJoin
              chip={monthKey}
              href="/payroll"
              label={dict.payTitle}
              icon={<WalletIcon />}
            />
          }
        />

        <section className="fb-kpis">
          <StaffKpi
            accent
            href="/payroll"
            label={dict.payGrandTotal}
            value={fmtNumber(totals.grandTotal)}
            foot={monthKey}
            icon={<WalletIcon />}
            delay={120}
          />
          <StaffKpi
            href="/payroll"
            label={dict.payStaffCount}
            value={totals.totalCount}
            foot={translate(locale, "fbdActiveStaff", { count: staffCount })}
            icon={<UsersIcon />}
            delay={160}
          />
          <StaffKpi
            href="/payroll"
            label={dict.payPending}
            value={pending}
            foot={dict.payApprove}
            icon={<ClockIcon />}
            delay={200}
          />
          <StaffKpi
            href="/payroll"
            label={dict.payDepartment}
            value={totals.byGroup.length}
            foot={dict.paySummarySubtitle}
            icon={<BuildingIcon />}
            delay={240}
          />
        </section>

        <div className="fb-grid">
          <div className="fb-col">
            <StaffPanel
              title={dict.payTabRecords}
              subtitle={monthKey}
              action={{ href: "/payroll", label: dict.fbdCardAll }}
              delay={160}
            >
              {records.length === 0 ? (
                <div className="fb-empty">
                  <b>{dict.payEmpty}</b>
                  <p>{dict.paySummarySubtitle}</p>
                </div>
              ) : (
                <div className="fb-list">
                  {records.map((record) => (
                    <div className="fb-listrow" key={record.id}>
                      <div className="fb-listrow-main">
                        <b>{record.user.name}</b>
                        <span>
                          {[record.user.staffPosition?.name, record.user.department?.name]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                      <div className="fb-listrow-end">
                        <span className={cn("fb-pill", SALARY_TONE[record.status])}>
                          {salaryLabel(record.status, dict)}
                        </span>
                        <span className="fb-listrow-val">{fmtNumber(record.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StaffPanel>

            <StaffPanel title={dict.dashQuickActions} delay={200}>
              <ActionTiles actions={actions} />
            </StaffPanel>
          </div>

          <div className="fb-col">
            <StaffPanel
              title={dict.paySummaryTitle}
              subtitle={dict.payMonth}
              action={{ href: "/payroll", label: dict.fbdCardAll }}
              delay={220}
            >
              {totals.byGroup.length === 0 ? (
                <div className="fb-empty">
                  <b>{dict.payNoGroupData}</b>
                  <p>{dict.paySummarySubtitle}</p>
                </div>
              ) : (
                <>
                  <div className="fb-list">
                    {totals.byGroup.map((group) => (
                      <div className="fb-listrow" key={group.group}>
                        <div className="fb-listrow-main">
                          <b>{group.group}</b>
                          <span>
                            {dict.payStaffCount}: {group.count}
                          </span>
                        </div>
                        <span className="fb-listrow-val">{fmtNumber(group.total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="fb-totalrow">
                    <span>{dict.payGrandTotal}</span>
                    <b>{fmtNumber(totals.grandTotal)}</b>
                  </div>
                </>
              )}
            </StaffPanel>
          </div>
        </div>

        <StaffStrip announcements={announcements} dict={dict} />
        <StaffFoot locale={locale} time={timeLabel} />
      </div>
    );
  }

  if (user.role !== "STUDENT") {
    const isTeacherRole = user.role === "TEACHER";
    const facultyScope = user.role === "DEKAN" ? user.facultyId ?? "__none__" : null;
    const departmentScope = user.role === "KAFEDRA_MUDIRI" ? user.departmentId ?? "__none__" : null;
    const courseWhere: Prisma.CourseWhereInput = isTeacherRole
      ? { teacherId: user.id }
      : facultyScope
        ? {
            OR: [
              { teacher: { facultyId: facultyScope } },
              { teacher: { department: { facultyId: facultyScope } } },
            ],
          }
        : departmentScope
          ? { teacher: { departmentId: departmentScope } }
          : {};
    const quizWhere: Prisma.QuizWhereInput = isTeacherRole
      ? { course: { teacherId: user.id } }
      : facultyScope
        ? {
            OR: [
              { course: { teacher: { facultyId: facultyScope } } },
              { course: { teacher: { department: { facultyId: facultyScope } } } },
            ],
          }
        : departmentScope
          ? { course: { teacher: { departmentId: departmentScope } } }
          : {};
    const studentWhere: Prisma.UserWhereInput = {
      role: "STUDENT",
      ...(facultyScope
        ? {
            OR: [
              { facultyId: facultyScope },
              {
                enrollments: {
                  some: {
                    status: "ACTIVE",
                    course: { teacher: { department: { facultyId: facultyScope } } },
                  },
                },
              },
            ],
          }
        : {}),
      ...(departmentScope
        ? {
            enrollments: {
              some: { status: "ACTIVE", course: { teacher: { departmentId: departmentScope } } },
            },
          }
        : {}),
    };
    const submissionWhere: Prisma.SubmissionWhereInput = isTeacherRole
      ? { assignment: { course: { teacherId: user.id } } }
      : facultyScope
        ? {
            OR: [
              { student: { facultyId: facultyScope } },
              {
                assignment: {
                  course: { teacher: { department: { facultyId: facultyScope } } },
                },
              },
            ],
          }
        : departmentScope
          ? { assignment: { course: { teacher: { departmentId: departmentScope } } } }
          : {};
    const [courses, students, submissions, quizzes] = await Promise.all([
      prisma.course.count({ where: courseWhere }),
      prisma.user.count({ where: studentWhere }),
      prisma.submission.count({ where: submissionWhere }),
      prisma.quiz.count({ where: quizWhere }),
    ]);
    const analytics = isTeacherRole
      ? await getTeacherAnalytics(user.id, locale)
      : await getAdminAnalytics(locale, {
          facultyId: facultyScope,
          departmentId: departmentScope,
        });

    const todayDow = now.getDay() === 0 ? 7 : now.getDay();
    const dateIso = todayIso();
    let todayLessons: TodayLesson[] = [];
    let cabinetCourses: WorkloadCourse[] = [];
    let cabinetSummary: WorkloadSummary = {
      courseCount: 0,
      studentCount: 0,
      pendingReviews: 0,
      weeklyHours: 0,
    };
    let cabinetPosition: string | null = null;
    let cabinetFace = false;
    let cabinetSalary: { monthLabel: string; total: number; status: string } | null = null;
    let cabinetSalaryVisible = false;
    if (user.role === "TEACHER") {
      const [
        entries,
        teacherCourses,
        marks,
        cabinetProfile,
        cabinetSalaryRow,
        cabinetWorkload,
        cabinetSalaryVisibleRow,
      ] = await Promise.all([
        prisma.scheduleEntry.findMany({
          where: {
            dayOfWeek: todayDow,
            OR: [{ teacherId: user.id }, { teacherId: null, teacher: { not: null } }],
          },
          orderBy: { slot: "asc" },
          include: { group: { select: { name: true } } },
        }),
        prisma.course.findMany({
          where: { teacherId: user.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          },
        }),
        prisma.attendance.groupBy({
          by: ["courseId"],
          where: { date: dateFromIso(dateIso), course: { teacherId: user.id } },
          _count: { _all: true },
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { faceDescriptor: true, staffPosition: { select: { name: true } } },
        }),
        prisma.salaryRecord.findFirst({
          where: { userId: user.id, status: { not: "DRAFT" } },
          orderBy: { month: "desc" },
          select: { month: true, total: true, status: true },
        }),
        buildWorkloadData({ teacherId: user.id, includeAllTeachers: false }),
        canViewSalary(user.role),
      ]);

      cabinetCourses = cabinetWorkload.courses;
      cabinetSummary = cabinetWorkload.summary;
      cabinetPosition = cabinetProfile?.staffPosition?.name ?? null;
      cabinetFace = isValidFaceDescriptor(cabinetProfile?.faceDescriptor);
      cabinetSalaryVisible = cabinetSalaryVisibleRow;
      cabinetSalary = cabinetSalaryRow
        ? {
            monthLabel: `${String(cabinetSalaryRow.month.getUTCMonth() + 1).padStart(2, "0")}.${cabinetSalaryRow.month.getUTCFullYear()}`,
            total: cabinetSalaryRow.total,
            status: cabinetSalaryRow.status,
          }
        : null;

      const teacherName = normalizeTeacherName(user.name);
      const markedByCourse = new Map(marks.map((row) => [row.courseId, row._count._all]));
      const options: CourseOption[] = teacherCourses.map((item) => ({
        slug: item.slug,
        title: item.title,
      }));
      const fallbackSlug = teacherCourses[0]?.slug ?? null;

      todayLessons = entries
        .filter((entry) =>
          entry.teacherId
            ? entry.teacherId === user.id
            : entry.teacher !== null && normalizeTeacherName(entry.teacher) === teacherName,
        )
        .map((entry) => {
          const matchedSlug = matchCourseSlug(entry.subject, options);
          const matched = teacherCourses.find((item) => item.slug === matchedSlug) ?? null;
          const slug = matched?.slug ?? fallbackSlug;
          const markedCount = matched ? (markedByCourse.get(matched.id) ?? 0) : 0;
          const total = matched?._count.enrollments ?? 0;
          return {
            id: entry.id,
            slot: entry.slot,
            subject: entry.subject,
            room: entry.room,
            groupName: entry.group.name,
            href: slug
              ? `/courses/${slug}/attendance/lesson?date=${dateIso}&slot=${entry.slot}`
              : null,
            statusText:
              markedCount > 0
                ? translate(locale, "dashMarkedStatus", { marked: markedCount, total })
                : dict.dashNotMarked,
            marked: markedCount > 0,
          };
        });
    }

    const actions: QuickAction[] =
      user.role === "ADMIN"
        ? [
            { href: "/admin", label: dict.dashActionStats, icon: <ChartIcon /> },
            { href: "/admin/users", label: dict.dashActionUsers, icon: <UsersIcon /> },
            { href: "/schedule", label: dict.dashActionSchedule, icon: <CalendarIcon /> },
            { href: "/reports", label: dict.dashActionReports, icon: <FileIcon /> },
          ]
        : user.role === "REGISTRAR"
          ? [
              { href: "/monitoring", label: dict.navMonitoring, icon: <ChartIcon /> },
              { href: "/approvals", label: dict.navApprovals, icon: <CheckIcon /> },
              { href: "/admin/users", label: dict.admNavUsers, icon: <UsersIcon /> },
              { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
            ]
          : user.role === "TYUTOR"
            ? [
                { href: "/curator", label: dict.navCurator, icon: <UsersIcon /> },
                { href: "/attendance", label: dict.dashActionAttendance, icon: <CheckIcon /> },
                { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
                { href: "/help", label: dict.navHelp, icon: <HelpIcon /> },
              ]
            : user.role === "TEACHER"
              ? [
                  { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
                  { href: "/workload", label: dict.navWorkload, icon: <ClipboardIcon /> },
                  { href: "/courses", label: dict.navCourses, icon: <BookIcon /> },
                  { href: "/journal", label: dict.navJournal, icon: <FileIcon /> },
                ]
              : [
                  { href: "/monitoring", label: dict.navMonitoring, icon: <ChartIcon /> },
                  { href: "/workload", label: dict.navWorkload, icon: <ClipboardIcon /> },
                  { href: "/schedule", label: dict.navSchedule, icon: <CalendarIcon /> },
                ];

    const staffStudentsHref =
      user.role === "ADMIN" || user.role === "REGISTRAR"
        ? "/admin/users"
        : user.role === "TYUTOR"
          ? "/curator"
          : user.role === "TEACHER"
            ? "/journal"
            : "/monitoring";

    const staffSubmissionsHref =
      user.role === "TEACHER"
        ? "/grades"
        : user.role === "TYUTOR"
          ? "/tasks"
          : user.role === "REGISTRAR"
            ? "/monitoring"
            : "/reports";

    if (analytics.kind === "teacher") {
      const lessonRows = todayLessons.map((lesson) => {
        const range = slotRange(lesson.slot);
        const start = range ? minutesOf(range.start) : 0;
        const end = range ? minutesOf(range.end) : 0;
        const state: "done" | "now" | "next" = !range
          ? "next"
          : nowMin >= end
            ? "done"
            : nowMin >= start
              ? "now"
              : "next";
        return { ...lesson, range, start, end, state };
      });
      const focusLesson =
        lessonRows.find((lesson) => lesson.state === "now") ??
        lessonRows.find((lesson) => lesson.state === "next") ??
        null;
      const focusTotal = focusLesson?.range ? focusLesson.end - focusLesson.start : 0;
      const focusElapsed =
        focusLesson?.range != null
          ? Math.max(0, Math.min(focusTotal, nowMin - focusLesson.start))
          : 0;
      const focusPct = focusTotal > 0 ? Math.round((focusElapsed / focusTotal) * 100) : 0;

      return (
        <div className="fb-dash">
          <FbMotion variant="dashboard" />
          <StaffHead
            name={user.name}
            roleLabel={roleLabel}
            scopeLabel={scopeLabel}
            now={now}
            locale={locale}
            stats={[
              translate(locale, "dashCoursesCountSubtitle", {
                count: cabinetSummary.courseCount,
              }),
              translate(locale, "fbdStudentsTag", { count: cabinetSummary.studentCount }),
              translate(locale, "dashLessonsCount", { count: lessonRows.length }),
            ]}
            actions={actions}
          />

          {focusLesson && focusLesson.range ? (
            <StaffFocus
              eyebrow={`${focusLesson.state === "now" ? dict.fbdFocusNow : dict.fbdFocusNext} · ${focusLesson.range.start}–${focusLesson.range.end}`}
              title={focusLesson.subject}
              meta={
                <>
                  <b>{focusLesson.groupName}</b>
                  <i />
                  <span>{focusLesson.room ?? dict.fbdFocusRoomUnknown}</span>
                  <i />
                  <span>{focusLesson.statusText}</span>
                </>
              }
              progress={
                focusLesson.state === "now"
                  ? {
                      top: dict.fbdFocusDuration,
                      right: translate(locale, "fbdFocusMinutes", {
                        elapsed: focusElapsed,
                        total: focusTotal,
                      }),
                      pct: focusPct,
                      bottom: translate(locale, "fbdFocusRemaining", {
                        min: Math.max(0, focusLesson.end - nowMin),
                      }),
                    }
                  : undefined
              }
              side={
                <FocusJoin
                  chip={
                    focusLesson.state === "now" ? dict.fbdFocusNow : dict.fbdFocusNext
                  }
                  href={
                    focusLesson.href ?? `/schedule/lesson/${focusLesson.id}`
                  }
                  label={
                    focusLesson.href ? dict.dashMarkAttendance : dict.navSchedule
                  }
                  icon={focusLesson.href ? <ClipboardIcon /> : <CalendarIcon />}
                />
              }
            />
          ) : (
            <StaffFocus
              eyebrow={dict.fbdFocusToday}
              title={
                lessonRows.length > 0 ? dict.fbdTeacherDoneTitle : dict.fbdFocusNoLesson
              }
              meta={
                <span>
                  {lessonRows.length > 0
                    ? dict.fbdTeacherDoneDesc
                    : dict.fbdFocusNoLessonDesc}
                </span>
              }
              side={
                <FocusJoin
                  chip={dict.fbdFocusToday}
                  href="/schedule"
                  label={dict.navSchedule}
                  icon={<CalendarIcon />}
                />
              }
            />
          )}

          <section className="fb-kpis">
            <StaffKpi
              accent
              href="/journal"
              label={dict.dashStatStudents}
              value={cabinetSummary.studentCount}
              foot={translate(locale, "dashCoursesCountSubtitle", {
                count: cabinetSummary.courseCount,
              })}
              icon={<UsersIcon />}
              delay={120}
            />
            <StaffKpi
              href="/courses"
              label={dict.dashStatCourses}
              value={cabinetSummary.courseCount}
              foot={dict.dashStatCoursesTeacherHint}
              icon={<BookIcon />}
              delay={160}
            />
            <StaffKpi
              href="/grades"
              label={dict.fbdPendingReviews}
              value={cabinetSummary.pendingReviews}
              foot={dict.fbdPendingReviewsFoot}
              icon={<ClipboardIcon />}
              delay={200}
            />
            <StaffKpi
              href="/workload"
              label={dict.fbdWeeklyHours}
              value={cabinetSummary.weeklyHours}
              unit={dict.fbdHoursUnit}
              foot={dict.fbdWorkloadFoot}
              icon={<ClockIcon />}
              delay={240}
            />
          </section>

          <div className="fb-grid">
            <div className="fb-col">
              <StaffPanel
                title={dict.dashMyTodayLessons}
                subtitle={translate(locale, "dashLessonsCount", { count: lessonRows.length })}
                action={{ href: "/schedule", label: dict.fbdCardFullSchedule }}
                delay={160}
              >
                {lessonRows.length === 0 ? (
                  <div className="fb-empty">
                    <b>{dict.dashNoLessonsTodayTitle}</b>
                    <p>{dict.dashNoLessonsTodayDesc}</p>
                  </div>
                ) : (
                  <div className="fb-sched">
                    {lessonRows.map((lesson) => (
                      <div
                        className={cn("fb-srow", lesson.state === "now" && "now")}
                        key={lesson.id}
                      >
                        <span className="fb-stime">
                          {lesson.range?.start ?? `#${lesson.slot}`}
                          {lesson.range ? <span>{lesson.range.end}</span> : null}
                        </span>
                        <span className="fb-sinfo">
                          <b>
                            <Link href={`/schedule/lesson/${lesson.id}`}>
                              {lesson.subject}
                            </Link>
                          </b>
                          <span>
                            {lesson.room ?? dict.fbdFocusRoomUnknown}
                            <i />
                            {lesson.groupName}
                          </span>
                        </span>
                        <span className="fb-srow-end">
                          <span className={cn("fb-pill", lesson.marked ? "green" : undefined)}>
                            {lesson.statusText}
                          </span>
                          {lesson.href ? (
                            <Link className="fb-srow-cta" href={lesson.href}>
                              {dict.fbdMarkShort}
                            </Link>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </StaffPanel>

              <StaffPanel
                title={dict.dashMyCourses}
                subtitle={translate(locale, "dashCoursesCountSubtitle", {
                  count: cabinetCourses.length,
                })}
                action={{ href: "/courses", label: dict.fbdCardAll }}
                delay={200}
              >
                {cabinetCourses.length === 0 ? (
                  <div className="fb-empty">
                    <b>{dict.dashNoCoursesTitle}</b>
                    <p>{dict.dashNoCoursesDesc}</p>
                  </div>
                ) : (
                  <div className="fb-table-wrap">
                    <table className="fb-table">
                      <thead>
                        <tr>
                          <th>{dict.fbdColSubject}</th>
                          <th>{dict.dashStatStudents}</th>
                          <th>{dict.fbdPendingReviews}</th>
                          <th>{dict.fbdWeeklyHours}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cabinetCourses.map((course, index) => (
                          <tr key={course.id}>
                            <td>
                              <Link className="fb-tname" href={`/courses/${course.slug}`}>
                                <i
                                  style={{
                                    background: ["#0071e3", "#d4af37", "#1d1d1f"][index % 3],
                                  }}
                                />
                                {course.title}
                              </Link>
                            </td>
                            <td className="fb-mono-num">{course.studentCount}</td>
                            <td>
                              <span
                                className={cn(
                                  "fb-pill",
                                  course.pendingSubmissions > 0 ? "amber" : "green",
                                )}
                              >
                                {course.pendingSubmissions}
                              </span>
                            </td>
                            <td className="fb-mono-num">{course.weeklyHours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </StaffPanel>
            </div>

            <div className="fb-col">
              <StaffPanel title={dict.fbdProfileTitle} subtitle={dict.fbdProfileSub} delay={160}>
                <div className="fb-kv">
                  <div>
                    <dt>{dict.payPosition}</dt>
                    <dd>{cabinetPosition ?? dict.roleTeacher}</dd>
                  </div>
                  <div>
                    <dt>{dict.payDepartment}</dt>
                    <dd>{user.department?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{dict.fbdFaculty}</dt>
                    <dd>{user.faculty?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{dict.fbdJoined}</dt>
                    <dd>{fmtDate(user.createdAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>Face ID</dt>
                    <dd>
                      <span className={cn("fb-pill", cabinetFace ? "green" : "amber")}>
                        {cabinetFace ? dict.fbdFaceOn : dict.fbdFaceOff}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{user.email}</dd>
                  </div>
                </div>
              </StaffPanel>

              <StaffPanel title={dict.fbdSalaryTitle} subtitle={dict.fbdSalarySub} delay={220}>
                {!cabinetSalaryVisible ? (
                  <div className="fb-empty">
                    <b>{dict.payNoGrant}</b>
                  </div>
                ) : !cabinetSalary ? (
                  <div className="fb-empty">
                    <b>{dict.fbdSalaryNone}</b>
                  </div>
                ) : (
                  <div className="fb-list">
                    <div className="fb-listrow">
                      <div className="fb-listrow-main">
                        <b>{cabinetSalary.monthLabel}</b>
                        <span>{dict.payTotal}</span>
                      </div>
                      <div className="fb-listrow-end">
                        <span className={cn("fb-pill", SALARY_TONE[cabinetSalary.status])}>
                          {salaryLabel(cabinetSalary.status, dict)}
                        </span>
                        <span className="fb-listrow-val">{fmtNumber(cabinetSalary.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </StaffPanel>

              <StaffPanel title={dict.dashQuickActions} delay={260}>
                <ActionTiles actions={actions} />
              </StaffPanel>
            </div>
          </div>

          <div className="fb-sechead" data-fb-reveal data-fb-delay="280">
            <div>
              <span className="fb-kicker">{dict.dashAnalyticsTitle}</span>
              <h2>{dict.dashLast14Days}</h2>
              <p>{dict.dashTeacherAnalyticsSubtitle}</p>
            </div>
          </div>

          <div className="fb-grid even">
            <StaffChart
              title={dict.dashAttendanceTrendTitle}
              subtitle={dict.dashLast14Days}
              note={dict.dashAttendanceTrendNote}
              empty={analytics.attendanceByDay.length === 0}
              emptyTitle={dict.dashNoDataTitle}
              emptyDescription={dict.dashAttendanceTrendEmpty}
              delay={300}
            >
              <LineChart data={analytics.attendanceByDay} />
            </StaffChart>
            <StaffChart
              title={dict.dashSubmissionsTitle}
              subtitle={dict.dashLast14Days}
              note={dict.dashSubmissionsNote}
              empty={!analytics.submissionsByDay.some((point) => point.value > 0)}
              emptyTitle={dict.dashNoDataTitle}
              emptyDescription={dict.dashSubmissionsEmpty}
              delay={320}
            >
              <BarChart data={analytics.submissionsByDay} />
            </StaffChart>
            <StaffChart
              title={dict.dashCourseStudentsTitle}
              subtitle={dict.dashStatStudents}
              note={dict.dashCourseStudentsNote}
              empty={analytics.studentsByCourse.length === 0}
              emptyTitle={dict.dashNoDataTitle}
              emptyDescription={dict.dashCourseStudentsEmpty}
              delay={340}
            >
              <BarChart data={analytics.studentsByCourse} />
            </StaffChart>
            <StaffChart
              title={dict.dashSubmissionStatusTitle}
              subtitle={dict.dashStatAssignments}
              note={dict.dashSubmissionStatusNote}
              empty={!analytics.submissionStatus.some((slice) => slice.value > 0)}
              emptyTitle={dict.dashNoDataTitle}
              emptyDescription={dict.dashSubmissionStatusEmpty}
              delay={360}
            >
              <DonutChart data={analytics.submissionStatus} />
            </StaffChart>
          </div>

          <StaffStrip announcements={announcements} dict={dict} />
          <StaffFoot locale={locale} time={timeLabel} />
        </div>
      );
    }

    const activeDays = analytics.submissionsByDay.filter((point) => point.value > 0).length;
    const activePct = Math.round((activeDays / 14) * 100);

    return (
      <div className="fb-dash">
        <FbMotion variant="dashboard" />
        <StaffHead
          name={user.name}
          roleLabel={roleLabel}
          scopeLabel={scopeLabel}
          now={now}
          locale={locale}
          stats={[
            translate(locale, "dashCoursesCountSubtitle", { count: courses }),
            translate(locale, "fbdStudentsTag", { count: students }),
            translate(locale, "fbdActiveDays", { active: activeDays, total: 14 }),
          ]}
          actions={actions}
        />

        <StaffFocus
          eyebrow={`${dict.fbdFocusToday} · ${dayName(now.getDay(), locale)}, ${dayMonth(now)}`}
          title={dict.fbdStaffFocusTitle}
          meta={
            <>
              <b>{roleLabel}</b>
              {scopeLabel ? (
                <>
                  <i />
                  <span>{scopeLabel}</span>
                </>
              ) : null}
              <i />
              <span>{dict.fbdStaffFocusMeta}</span>
            </>
          }
          stats={[
            { value: students, label: dict.dashStatStudents },
            { value: courses, label: dict.dashStatCourses },
            { value: submissions, label: dict.dashStatAssignments },
            { value: quizzes, label: dict.dashStatQuizzes },
          ]}
          progress={{
            top: dict.dashLast14Days,
            right: translate(locale, "fbdActiveDays", { active: activeDays, total: 14 }),
            pct: activePct,
            bottom: dict.fbdActiveNote,
          }}
          side={
            <FocusJoin
              chip={dict.dashLast14Days}
              href={actions[0]?.href ?? "/monitoring"}
              label={actions[0]?.label ?? dict.navMonitoring}
              icon={<ArrowIcon />}
            />
          }
        />

        <section className="fb-kpis">
          <StaffKpi
            accent
            href={staffStudentsHref}
            label={dict.dashStatStudents}
            value={students}
            foot={dict.dashStatStudentsHint}
            icon={<UsersIcon />}
            delay={120}
          />
          <StaffKpi
            href="/courses"
            label={dict.dashStatCourses}
            value={courses}
            foot={
              user.role === "TEACHER"
                ? dict.dashStatCoursesTeacherHint
                : dict.dashStatCoursesAdminHint
            }
            icon={<BookIcon />}
            delay={160}
          />
          <StaffKpi
            href={staffSubmissionsHref}
            label={dict.dashStatAssignments}
            value={submissions}
            foot={dict.dashStatAssignmentsHint}
            icon={<ClipboardIcon />}
            delay={200}
          />
          <StaffKpi
            href="/quizzes"
            label={dict.dashStatQuizzes}
            value={quizzes}
            foot={dict.dashStatQuizzesHint}
            icon={<HelpIcon />}
            delay={240}
          />
        </section>

        <div className="fb-grid">
          <div className="fb-col">
            <StaffChart
              title={dict.dashSubmissionsTrendTitle}
              subtitle={dict.dashLast14Days}
              note={dict.dashSubmissionsNote}
              empty={!analytics.submissionsByDay.some((point) => point.value > 0)}
              emptyTitle={dict.dashNoDataTitle}
              emptyDescription={dict.dashSubmissionsEmpty}
              delay={160}
            >
              <BarChart data={analytics.submissionsByDay} />
            </StaffChart>

            <StaffPanel title={dict.dashQuickActions} delay={200}>
              <ActionTiles actions={actions} />
            </StaffPanel>
          </div>

          <div className="fb-col">
            <StaffChart
              title={dict.dashUserRolesTitle}
              subtitle={dict.dashLast14Days}
              note={dict.dashUserRolesNote}
              empty={analytics.usersByRole.every((slice) => slice.value === 0)}
              emptyTitle={dict.dashNoDataTitle}
              emptyDescription={dict.dashUserRolesEmpty}
              delay={220}
            >
              <DonutChart data={analytics.usersByRole} />
            </StaffChart>
          </div>
        </div>

        <StaffStrip announcements={announcements} dict={dict} />
        <StaffFoot locale={locale} time={timeLabel} />
      </div>
    );
  }

  return (
    <StudentHome
      userId={user.id}
      userName={user.name}
      groupId={user.groupId}
      groupName={user.group?.name ?? null}
      locale={locale}
    />
  );
}
