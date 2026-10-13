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
      ],
    },
  ].filter((group) => group.links.length > 0);

  const ROLE_MENU: Record<string, string[]> = {
    REKTOR: [
      "/dashboard", "/assistant", "/monitoring", "/admissions", "/reports", "/workload", "/documents", "/diplomas", "/finance",
      "/staff", "/tasks", "/my-qr", "/schedule", "/calendar", "/academic-calendar", "/research",
      "/messages", "/search", "/help", "/settings", "/access",
      // Ko'rinishi `salaryVisible` ga bog'liq — ruxsat bo'lmasa yo'qoladi.
      "/payroll",
    ],
    PRO_RECTOR: [
      "/dashboard", "/assistant", "/monitoring", "/admissions", "/reports", "/workload", "/documents", "/diplomas", "/finance",
      "/staff", "/tasks", "/my-qr", "/schedule", "/calendar", "/academic-calendar", "/research",
      "/messages", "/search", "/help", "/settings", "/access",
      // Ko'rinishi `salaryVisible` ga bog'liq — ruxsat bo'lmasa yo'qoladi.
      "/payroll",
    ],
    DEKAN: [
      "/dashboard", "/assistant", "/monitoring", "/reports", "/workload", "/staff", "/tasks", "/my-qr",
      "/schedule", "/calendar", "/academic-calendar", "/research", "/messages", "/search", "/help", "/settings",
      // Ko'rinishi `salaryVisible` ga bog'liq — ruxsat bo'lmasa yo'qoladi.
      "/payroll",
    ],
    KAFEDRA_MUDIRI: [
      "/dashboard", "/assistant", "/monitoring", "/reports", "/workload", "/staff", "/tasks", "/my-qr",
      "/schedule", "/calendar", "/academic-calendar", "/research", "/messages", "/search", "/help", "/settings",
    ],
    REGISTRAR: [
      "/dashboard", "/assistant", "/monitoring", "/admissions", "/approvals", "/finance", "/documents", "/diplomas", "/staff",
      "/tasks", "/admin/users", "/admin/groups", "/admin/import", "/admin/hemis", "/schedule",
      "/calendar", "/academic-calendar", "/rooms", "/messages", "/search", "/help", "/settings",
      "/my-qr", "/access",
    ],
    TYUTOR: [
      "/dashboard", "/assistant", "/curator", "/attendance", "/schedule", "/calendar", "/academic-calendar",
      "/tasks", "/staff", "/my-qr", "/messages", "/search", "/help", "/settings",
    ],
    TEACHER: [
      "/dashboard", "/assistant", "/courses", "/board", "/journal", "/journals",
      "/question-bank", "/schedule", "/calendar", "/academic-calendar", "/exams", "/secure-exams", "/attendance",
      "/reports", "/workload", "/staff", "/tasks", "/my-qr", "/messages", "/bookings", "/rooms",
      "/research", "/search", "/help", "/settings",
    ],
    STUDENT: [
      "/dashboard", "/assistant", "/courses", "/board", "/schedule", "/calendar",
      "/academic-calendar", "/exams", "/secure-exams", "/grades", "/gpa", "/transcript", "/attendance",
      "/certificates", "/finance", "/my-qr", "/messages", "/orders", "/bookings", "/rooms",
      "/search", "/help", "/settings",
    ],
    XODIM: [
      "/dashboard", "/assistant", "/staff", "/tasks", "/my-qr", "/access", "/schedule", "/calendar",
      "/academic-calendar", "/messages", "/rooms", "/bookings", "/search", "/help", "/settings",
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
      "/messages", "/my-qr", "/search", "/help", "/settings",
    ],
    OTA_ONA: ["/assistant", "/parent", "/messages", "/help", "/settings"],
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

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <div className="flex min-h-screen">
      {/* Sidebar HAR DOIM ko'rinadi. Avval `hidden md:flex` edi — brauzerda
          kattalashtirganda (Ctrl/Cmd + yoki pinch-zoom) CSS kenglik 768px
          dan pastga tushardi va sidebar butunlay yo'qolardi (videodagi
          holat). Endi u faqat kichrayadi (icon rail), lekin yo'qolmaydi. */}
      <aside className="app-shell-sidebar sticky top-0 z-30 flex h-dvh w-64 shrink-0 flex-col border-r border-slate-200/60 bg-white/85 backdrop-blur-xl">
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
      <TourGuide role={user.role} />
      <OfflineBanner />
    </div>
    </LocaleProvider>
  );
}
