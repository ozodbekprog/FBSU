import Link from "next/link";
import { requireUser, isStaff, canViewSalary, canManageSalary } from "@/lib/auth";
import { canViewAnalysis } from "@/modules/roles/access";
import { getModuleFlags } from "@/server/settings";
import { getMaintenanceMode } from "@/server/maintenance";
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
import { AppTopbar } from "@/components/fb/app-topbar";
import { BugAssistant } from "@/components/bugs/bug-assistant";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { TourGuide } from "@/components/tour/tour-guide";
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

  // Maintenance rejimi: admindan boshqa har bir foydalanuvchi uchun
  // brend uslubidagi "texnik xizmat" ekrani ko'rsatiladi.
  // ADMIN tizimni boshqarishi uchun hamma narsaga kiraveradi.
  if (user.role !== "ADMIN" && (await getMaintenanceMode())) {
    return (
      <LocaleProvider locale={locale} dictionary={dictionary}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
          <Link href="/dashboard" className="mb-8 transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(29,52,96,0.14)]">
            <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-900 text-white shadow-lg shadow-brand-900/25">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 18v3M7.8 16.3l-2.2 2.1M3 12h3M7.8 7.7 5.6 5.6" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-brand-950">Tizim texnik xizmatda</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Hozircha texnik xizmat ishlari olib borilmoqda. Iltimos, birozdan keyin qaytib kiring.
            </p>
            <LogoutForm />
          </div>
        </div>
      </LocaleProvider>
    );
  }

  // "Oyliklar" nav elementi faqat oylikni ko'rishga ruxsat bor rollarga
  // ko'rinadi: BUXGALTER va ADMIN har doim, qolganlari faqat buxgalter
  // `SalaryGrant` bergan bo'lsa. Ruxsat bekor qilinishi bilan bu yer
  // qayta chiziladi va element yo'qoladi — shuning uchun ro'yxatni
  // qo'lda sinxronlash shart emas.
  const salaryVisible = await canViewSalary(user.role);

  const groups = [
    {
      label: dictionary.navGroupMain,
      links: [
        { href: "/dashboard", label: dictionary.navDashboard },
        { href: "/assistant", label: dictionary.navAssistant },
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
        ...(modules.secure_exams
          ? [{ href: "/secure-exams", label: dictionary.navSecureExams }]
          : []),
        { href: "/grades", label: isStaff(user.role) ? dictionary.navGradesStaff : dictionary.navGradesStudent },
        { href: "/gpa", label: dictionary.navGpa },
        { href: "/transcript", label: dictionary.navTranscript },
        { href: "/attendance", label: dictionary.navAttendance },
        { href: "/board", label: dictionary.brdTitle },
        ...(isStaff(user.role) ? [{ href: "/journal", label: dictionary.navJournal }] : []),
        ...(modules.certificates ? [{ href: "/certificates", label: dictionary.navCertificates }] : []),
        ...(isStaff(user.role) ? [{ href: "/journals", label: dictionary.navJournals }] : []),
        ...(isStaff(user.role) ? [{ href: "/question-bank", label: dictionary.navQuestionBank }] : []),
        ...(isStaff(user.role) || ["DEKAN","KAFEDRA_MUDIRI","PRO_RECTOR","REKTOR"].includes(user.role)
          ? [{ href: "/research", label: dictionary.resTitle }]
          : []),
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
        ...(salaryVisible
          ? [
              {
                href: "/payroll",
                label: canManageSalary(user.role)
                  ? dictionary.payTitle
                  : dictionary.payNavGranted,
              },
            ]
          : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/documents", label: dictionary.docTitle }]
          : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/diplomas", label: dictionary.dipTitle }]
          : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR", "STUDENT"].includes(user.role)
          ? [{ href: "/finance", label: dictionary.finTitle }]
          : []),
        ...(["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/finance/rates", label: dictionary.finNavRates }]
          : []),
        ...(user.role === "TEACHER" || user.role === "ADMIN"
          ? [{ href: "/teacher-points", label: dictionary.tchNavPoints }]
          : []),
        { href: "/my-qr", label: dictionary.accMyQr },
        ...(["ADMIN", "REGISTRAR", "XODIM", "REKTOR", "PRO_RECTOR"].includes(user.role)
          ? [{ href: "/access", label: dictionary.accTitle }]
          : []),
        // Buxgalter oylik hisobini qo'lda kiritadi — turniket qo'riqchisi
        // o'tishlari uning uchun audit izi bo'lib xizmat qiladi.
        ...(user.role === "BUXGALTER"
          ? [{ href: "/turniket", label: dictionary.accTitle }]
          : []),
        { href: "/search", label: dictionary.navSearch },
        { href: "/help", label: dictionary.navHelp },
        { href: "/bounty", label: dictionary.navBounty },
        { href: "/settings", label: dictionary.navSettings },
      ],
    },
    {
      label: dictionary.navGroupManage,
      links: [
        ...(["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR"].includes(user.role)
          ? [{ href: "/monitoring", label: dictionary.navMonitoring }]
          : []),
        ...(["ADMIN", "REKTOR", "PRO_RECTOR", "REGISTRAR"].includes(user.role)
          ? [{ href: "/admissions", label: dictionary.qblTitle }]
          : []),
        ...(user.role === "ADMIN" || user.role === "REGISTRAR"
          ? [{ href: "/approvals", label: dictionary.navApprovals }]
          : []),
        ...(isStaff(user.role) || user.role === "TYUTOR"
          ? [{ href: "/curator", label: dictionary.navCurator }]
          : []),
        ...(user.role === "ADMIN" || user.role === "NAZORATCHI"
          ? [{ href: "/nazorat", label: dictionary.navNazorat }]
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
        ...(user.role === "OWNER"
          ? [{ href: "/owner/security", label: "Xavfsizlik jurnali" }]
          : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  const ROLE_MENU: Record<string, string[]> = {
    REKTOR: [
      "/dashboard", "/assistant", "/monitoring", "/admissions", "/reports", "/workload", "/documents", "/diplomas", "/finance",
      "/staff", "/tasks", "/my-qr", "/schedule", "/calendar", "/academic-calendar", "/research",
      "/messages", "/search", "/help", "/bounty", "/settings", "/access",
      // Ko'rinishi `salaryVisible` ga bog'liq — ruxsat bo'lmasa yo'qoladi.
      "/payroll",
    ],
    PRO_RECTOR: [
      "/dashboard", "/assistant", "/monitoring", "/admissions", "/reports", "/workload", "/documents", "/diplomas", "/finance",
      "/staff", "/tasks", "/my-qr", "/schedule", "/calendar", "/academic-calendar", "/research",
      "/messages", "/search", "/help", "/bounty", "/settings", "/access",
      // Ko'rinishi `salaryVisible` ga bog'liq — ruxsat bo'lmasa yo'qoladi.
      "/payroll",
    ],
    DEKAN: [
      "/dashboard", "/assistant", "/monitoring", "/reports", "/workload", "/staff", "/tasks", "/my-qr",
      "/schedule", "/calendar", "/academic-calendar", "/research", "/messages", "/search", "/help", "/bounty", "/settings",
      // Ko'rinishi `salaryVisible` ga bog'liq — ruxsat bo'lmasa yo'qoladi.
      "/payroll",
    ],
    KAFEDRA_MUDIRI: [
      "/dashboard", "/assistant", "/monitoring", "/reports", "/workload", "/staff", "/tasks", "/my-qr",
      "/schedule", "/calendar", "/academic-calendar", "/research", "/messages", "/search", "/help", "/bounty", "/settings",
    ],
    REGISTRAR: [
      "/dashboard", "/assistant", "/monitoring", "/admissions", "/approvals", "/finance", "/documents", "/diplomas", "/staff",
      "/tasks", "/admin/users", "/admin/groups", "/admin/import", "/admin/hemis", "/schedule",
      "/calendar", "/academic-calendar", "/rooms", "/messages", "/search", "/help", "/bounty", "/settings",
      "/my-qr", "/access",
    ],
    TYUTOR: [
      "/dashboard", "/assistant", "/curator", "/attendance", "/schedule", "/calendar", "/academic-calendar",
      "/tasks", "/staff", "/my-qr", "/messages", "/search", "/help", "/bounty", "/settings",
    ],
    TEACHER: [
      "/dashboard", "/assistant", "/courses", "/board", "/journal", "/journals",
      "/question-bank", "/schedule", "/calendar", "/academic-calendar", "/exams", "/secure-exams", "/attendance",
      "/reports", "/workload", "/staff", "/tasks", "/my-qr", "/messages", "/bookings", "/rooms",
      "/research", "/teacher-points", "/search", "/help", "/bounty", "/settings",
    ],
    STUDENT: [
      "/dashboard", "/assistant", "/courses", "/board", "/schedule", "/calendar",
      "/academic-calendar", "/exams", "/secure-exams", "/grades", "/gpa", "/transcript", "/attendance",
      "/certificates", "/finance", "/my-qr", "/messages", "/orders", "/bookings", "/rooms",
      "/search", "/help", "/bounty", "/settings",
    ],
    XODIM: [
      "/dashboard", "/assistant", "/staff", "/tasks", "/my-qr", "/access", "/schedule", "/calendar",
      "/academic-calendar", "/messages", "/rooms", "/bookings", "/search", "/help", "/bounty", "/settings",
    ],
    NAZORATCHI: [
      "/dashboard", "/nazorat", "/messages", "/search", "/help", "/settings",
    ],
    // Buxgalter: moliyaviy vazifa uchun faqat kerakli bo'limlar.
    // Jadval, davomat va xodimlar davomati olib tashlandi — ular oylik
    // hisobiga to'g'ridan-to'g'ri kirmaydi, `/payroll` ichida o'z
    // lavozim/navbar/grafik boshqaruvi bor.
    BUXGALTER: [
      "/dashboard", "/assistant", "/payroll", "/turniket", "/calendar",
      "/messages", "/my-qr", "/search", "/help", "/bounty", "/settings",
    ],
    OTA_ONA: ["/assistant", "/parent", "/messages", "/help", "/bounty", "/settings"],
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
              : user.role === "BUXGALTER"
                ? dictionary.payRoleBuxgalter
                : user.role === "TYUTOR"
                  ? dictionary.roleTutor
                  : user.role === "XODIM"
                    ? dictionary.roleStaff
                    : user.role === "OTA_ONA"
                      ? dictionary.roleParent
                    : user.role === "NAZORATCHI"
                      ? dictionary.roleNazoratchi
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

  const topbarItems = visibleGroups.flatMap((group) =>
    group.links.map((link) => ({ href: link.href, label: link.label })),
  );
  const scopeLabel = user.role === "STUDENT" ? dictionary.fbdRoleChip : roleLabel;

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lift"
      >
        {dictionary.landSkipToContent}
      </a>
      <div className="fb-shell flex min-h-screen" data-fb-root="dashboard">
        {/* Sidebar HAR DOIM ko'rinadi. Avval `hidden md:flex` edi — brauzerda
            kattalashtirganda CSS kenglik 768px dan pastga tushardi va sidebar
            butunlay yo'qolardi. Endi u faqat kichrayadi (icon rail). */}
        <aside className="app-shell-sidebar fb-sidebar sticky top-0 z-30 flex h-dvh shrink-0 flex-col">
          <div className="fb-side-head">
            <Link href="/dashboard" className="fb-side-brand">
              <img src="/logo.svg" alt="FBSU" width={28} height={28} />
              <span className="fb-side-name">
                <b>FBSU</b>
                <small>TURIN POLYTECHNIC</small>
              </span>
            </Link>
          </div>
          <Link href="/profile" className="fb-side-cabinet">
            <span>
              <em>{dictionary.fbdCabinet}</em>
              <b>{roleLabel}</b>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Link>
          <NavLinks groups={visibleGroups} />
          <div className="fb-side-foot border-t border-slate-100">
            <Link
              href="/profile"
              className="fb-side-user flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
            >
              <Avatar name={user.name} src={user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{roleLabel}</p>
              </div>
            </Link>
            <div className="fb-side-actions">
              <LanguageSwitcher locale={locale} />
              <LogoutForm />
            </div>
          </div>
        </aside>
        <div className="fb-shell-main flex min-w-0 flex-1 flex-col">
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
          <AppTopbar
            name={user.name}
            avatarUrl={user.avatarUrl}
            roleLabel={roleLabel}
            scopeLabel={scopeLabel}
            items={topbarItems}
          />
          <main id="main-content" tabIndex={-1} className="fb-main">{children}</main>
        </div>
        <MobileTabBar tabs={visibleTabs} />
        <BugAssistant />
        <TourGuide role={user.role} />
        <OfflineBanner />
      </div>
    </LocaleProvider>
  );
}
