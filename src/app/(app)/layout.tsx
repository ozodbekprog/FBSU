import Link from "next/link";
import { requireUser, isStaff } from "@/lib/auth";
import { canViewAnalysis } from "@/modules/roles/access";
import { getModuleFlags } from "@/server/settings";
import { getDictionary, getLocale } from "@/i18n";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UnreadBadge } from "@/components/chat/UnreadBadge";
import { LogoutForm } from "@/components/auth/logout-form";
import { Logo } from "@/components/brand/logo";
import { MobileTabBar, NavLinks, type MobileTab, type MobileTabIcon } from "./nav-links";
import { MobileNav } from "@/components/nav/mobile-nav";
import { BugAssistant } from "@/components/bugs/bug-assistant";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const modules = await getModuleFlags();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const groups = [
    {
      label: dictionary.navGroupMain,
      links: [
        { href: "/dashboard", label: dictionary.navDashboard },
        ...(user.role === "OTA_ONA" ? [{ href: "/parent", label: dictionary.parentTitle }] : []),
        { href: "/courses", label: dictionary.navCourses },
        { href: "/schedule", label: dictionary.navSchedule },
        { href: "/calendar", label: dictionary.navCalendar },
      ],
    },
    {
      label: dictionary.navGroupStudy,
      links: [
        { href: "/exams", label: dictionary.navExams },
        { href: "/grades", label: isStaff(user.role) ? dictionary.navGradesStaff : dictionary.navGradesStudent },
        { href: "/gpa", label: dictionary.navGpa },
        { href: "/transcript", label: dictionary.navTranscript },
        { href: "/attendance", label: dictionary.navAttendance },
        ...(isStaff(user.role) ? [{ href: "/journal", label: dictionary.navJournal }] : []),
        ...(modules.certificates ? [{ href: "/certificates", label: dictionary.navCertificates }] : []),
        ...(isStaff(user.role) ? [{ href: "/journals", label: dictionary.navJournals }] : []),
        ...(isStaff(user.role) ? [{ href: "/question-bank", label: dictionary.navQuestionBank }] : []),
      ],
    },
    {
      label: dictionary.navGroupTalk,
      links: [
        ...(modules.chat ? [{ href: "/messages", label: dictionary.navMessages, badge: <UnreadBadge /> }] : []),
        { href: "/orders", label: dictionary.navOrders },
        { href: "/bookings", label: dictionary.navBookings },
        { href: "/rooms", label: dictionary.navRooms },
      ],
    },
    {
      label: dictionary.navGroupServices,
      links: [
        ...(user.role !== "STUDENT" ? [{ href: "/staff", label: dictionary.stfTitle }] : []),
        ...(user.role !== "STUDENT" ? [{ href: "/tasks", label: dictionary.tskTitle }] : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/documents", label: dictionary.docTitle }]
          : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/diplomas", label: dictionary.dipTitle }]
          : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR", "STUDENT"].includes(user.role)
          ? [{ href: "/finance", label: dictionary.finTitle }]
          : []),
        { href: "/my-qr", label: dictionary.accMyQr },
        ...(["ADMIN", "REGISTRAR", "XODIM", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/access", label: dictionary.accTitle }]
          : []),
        { href: "/search", label: dictionary.navSearch },
        { href: "/help", label: dictionary.navHelp },
        { href: "/settings", label: dictionary.navSettings },
      ],
    },
    {
      label: dictionary.navGroupManage,
      links: [
        ...(["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR"].includes(user.role)
          ? [{ href: "/monitoring", label: dictionary.navMonitoring }]
          : []),
        ...(user.role === "ADMIN" || user.role === "REGISTRAR"
          ? [{ href: "/approvals", label: dictionary.navApprovals }]
          : []),
        ...(isStaff(user.role) || user.role === "TYUTOR"
          ? [{ href: "/curator", label: dictionary.navCurator }]
          : []),
        ...(user.role === "REGISTRAR"
          ? [
              { href: "/admin/users", label: dictionary.admNavUsers },
              { href: "/admin/groups", label: dictionary.admNavGroups },
            ]
          : []),
        ...(canViewAnalysis(user.role) ? [{ href: "/reports", label: dictionary.navReports }] : []),
        ...(canViewAnalysis(user.role) ? [{ href: "/workload", label: dictionary.navWorkload }] : []),
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: dictionary.navAdmin }] : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  const ROLE_MENU: Record<string, string[]> = {
    REKTOR: [
      "/dashboard", "/monitoring", "/reports", "/workload", "/documents", "/diplomas", "/finance",
      "/staff", "/tasks", "/my-qr", "/schedule", "/calendar", "/academic-calendar",
      "/messages", "/search", "/help", "/settings", "/access",
    ],
    PRO_RECTOR: [
      "/dashboard", "/monitoring", "/reports", "/workload", "/documents", "/diplomas", "/finance",
      "/staff", "/tasks", "/my-qr", "/schedule", "/calendar", "/academic-calendar",
      "/messages", "/search", "/help", "/settings", "/access",
    ],
    DEKAN: [
      "/dashboard", "/monitoring", "/reports", "/workload", "/staff", "/tasks", "/my-qr",
      "/schedule", "/calendar", "/academic-calendar", "/messages", "/search", "/help", "/settings",
    ],
    KAFEDRA_MUDIRI: [
      "/dashboard", "/monitoring", "/reports", "/workload", "/staff", "/tasks", "/my-qr",
      "/schedule", "/calendar", "/academic-calendar", "/messages", "/search", "/help", "/settings",
    ],
    REGISTRAR: [
      "/dashboard", "/monitoring", "/approvals", "/finance", "/documents", "/diplomas", "/staff",
      "/tasks", "/admin/users", "/admin/groups", "/admin/import", "/admin/hemis", "/schedule",
      "/calendar", "/academic-calendar", "/rooms", "/messages", "/search", "/help", "/settings",
      "/my-qr", "/access",
    ],
    TYUTOR: [
      "/dashboard", "/curator", "/attendance", "/schedule", "/calendar", "/academic-calendar",
      "/tasks", "/staff", "/my-qr", "/messages", "/search", "/help", "/settings",
    ],
    TEACHER: [
      "/dashboard", "/courses", "/journal", "/journals",
      "/question-bank", "/schedule", "/calendar", "/academic-calendar", "/exams", "/attendance",
      "/reports", "/workload", "/staff", "/tasks", "/my-qr", "/messages", "/bookings", "/rooms",
      "/search", "/help", "/settings",
    ],
    STUDENT: [
      "/dashboard", "/courses", "/schedule", "/calendar",
      "/academic-calendar", "/exams", "/grades", "/gpa", "/transcript", "/attendance",
      "/certificates", "/finance", "/my-qr", "/messages", "/orders", "/bookings", "/rooms",
      "/search", "/help", "/settings",
    ],
    XODIM: [
      "/dashboard", "/staff", "/tasks", "/my-qr", "/access", "/schedule", "/calendar",
      "/academic-calendar", "/messages", "/rooms", "/bookings", "/search", "/help", "/settings",
    ],
    OTA_ONA: ["/parent", "/messages", "/help", "/settings"],
  };

  const allowedHrefs = ROLE_MENU[user.role];
  const visibleGroups = allowedHrefs
    ? groups
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => allowedHrefs.includes(link.href)),
        }))
        .filter((group) => group.links.length > 0)
    : groups;

  const roleLabel =
    user.role === "ADMIN"
      ? dictionary.roleAdmin
      : user.role === "REKTOR"
        ? dictionary.roleRector
        : user.role === "PRO_RECTOR"
          ? dictionary.roleProRector
          : user.role === "DEKAN"
          ? dictionary.roleDean
          : user.role === "KAFEDRA_MUDIRI"
            ? dictionary.roleHead
            : user.role === "REGISTRAR"
              ? dictionary.roleRegistrar
              : user.role === "TYUTOR"
                ? dictionary.roleTutor
                : user.role === "XODIM"
                  ? dictionary.roleStaff
                  : user.role === "OTA_ONA"
                    ? dictionary.roleParent
                    : user.role === "TEACHER"
                  ? dictionary.roleTeacher
                  : user.group?.name ?? dictionary.roleStudent;

  const tabs: MobileTab[] = [
    { href: "/dashboard", label: dictionary.navDashboard, icon: "home" },
    { href: "/courses", label: dictionary.navCourses, icon: "book" },
    ...(isStaff(user.role)
      ? [{ href: "/journal", label: dictionary.navJournal, icon: "list" as MobileTabIcon }]
      : []),
    { href: "/schedule", label: dictionary.navSchedule, icon: "calendar" },
    { href: "/grades", label: isStaff(user.role) ? dictionary.navGradesStaff : dictionary.navGradesStudent, icon: "chart" },
  ];

  if (modules.chat) {
    tabs.push({ href: "/messages", label: dictionary.navMessages, icon: "chat", badge: <UnreadBadge /> });
  }

  const visibleTabs: MobileTab[] =
    user.role === "OTA_ONA"
      ? [
          { href: "/parent", label: dictionary.parentTitle, icon: "home" },
          { href: "/messages", label: dictionary.navMessages, icon: "chat" },
          { href: "/settings", label: dictionary.navSettings, icon: "list" },
        ]
      : tabs;

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <div className="flex min-h-screen">
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white md:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/dashboard" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell align="left" />
            <ThemeToggle />
          </div>
        </div>
        <NavLinks groups={visibleGroups} />
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex justify-center">
            <LanguageSwitcher locale={locale} />
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 transition-colors hover:bg-brand-50"
          >
            <Avatar name={user.name} src={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
          </Link>
          <LogoutForm />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-1">
            <MobileNav groups={visibleGroups} />
            <Link href="/dashboard" className="transition-opacity hover:opacity-80">
              <Logo size={28} withText={false} />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell align="right" />
            <ThemeToggle />
            <Link
              href="/profile"
              aria-label={dictionary.shellProfile}
              className="rounded-full transition-opacity hover:opacity-80"
            >
              <Avatar name={user.name} src={user.avatarUrl} size={30} />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-20 md:px-8 md:pt-8 md:pb-8">{children}</main>
      </div>
      <MobileTabBar tabs={visibleTabs} />
      <BugAssistant />
    </div>
    </LocaleProvider>
  );
}
