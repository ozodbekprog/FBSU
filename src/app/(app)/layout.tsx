import Link from "next/link";
import { requireUser, isStaff } from "@/lib/auth";
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
      label: "Asosiy",
      links: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/courses", label: "Kurslar" },
        ...(modules.catalog ? [{ href: "/catalog", label: "Katalog" }] : []),
        { href: "/electives", label: "Tanlov fanlar" },
        { href: "/schedule", label: "Jadval" },
        ...(modules.calendar ? [{ href: "/calendar", label: "Kalendar" }] : []),
        { href: "/academic-calendar", label: "O'quv kalendari" },
      ],
    },
    {
      label: "O'qish",
      links: [
        { href: "/exams", label: "Imtihonlar" },
        { href: "/grades", label: isStaff(user.role) ? "Baholash" : "Baholarim" },
        { href: "/gpa", label: "GPA" },
        { href: "/transcript", label: "Transkript" },
        { href: "/attendance", label: "Davomat" },
        ...(isStaff(user.role) ? [{ href: "/journal", label: "Jurnal" }] : []),
        ...(modules.certificates ? [{ href: "/certificates", label: "Sertifikatlar" }] : []),
        ...(isStaff(user.role) ? [{ href: "/journals", label: "Kundaliklar" }] : []),
        ...(isStaff(user.role) ? [{ href: "/question-bank", label: "Savollar banki" }] : []),
      ],
    },
    {
      label: "Muloqot",
      links: [
        ...(modules.chat ? [{ href: "/messages", label: "Xabarlar", badge: <UnreadBadge /> }] : []),
        { href: "/orders", label: "Arizalar" },
        { href: "/bookings", label: "Xona broni" },
        { href: "/rooms", label: "Xonalar" },
      ],
    },
    {
      label: "Xizmatlar",
      links: [
        { href: "/search", label: "Qidiruv" },
        { href: "/help", label: "Yordam" },
        { href: "/settings", label: "Sozlamalar" },
      ],
    },
    {
      label: "Boshqaruv",
      links: [
        ...(user.role === "ADMIN" || user.role === "REGISTRAR"
          ? [{ href: "/approvals", label: "Tasdiqlashlar" }]
          : []),
        ...(isStaff(user.role) ? [{ href: "/curator", label: "Kurator paneli" }] : []),
        ...(isStaff(user.role) ? [{ href: "/reports", label: "Hisobotlar" }] : []),
        ...(isStaff(user.role) ? [{ href: "/workload", label: "Yuklama" }] : []),
        ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin panel" }] : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  const roleLabel =
    user.role === "ADMIN"
      ? "Administrator"
      : user.role === "REGISTRAR"
        ? "O'quv bo'limi"
        : user.role === "TEACHER"
          ? "O'qituvchi"
          : user.group?.name ?? "Talaba";

  const tabs: MobileTab[] = [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    { href: "/courses", label: "Kurslar", icon: "book" },
    ...(isStaff(user.role)
      ? [{ href: "/journal", label: "Jurnal", icon: "list" as MobileTabIcon }]
      : []),
    { href: "/schedule", label: "Jadval", icon: "calendar" },
    { href: "/grades", label: isStaff(user.role) ? "Baholash" : "Baholar", icon: "chart" },
  ];

  if (modules.chat) {
    tabs.push({ href: "/messages", label: "Xabarlar", icon: "chat", badge: <UnreadBadge /> });
  }

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
        <NavLinks groups={groups} />
        <div className="border-t border-slate-100 p-3">
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
            <MobileNav groups={groups} />
            <Link href="/dashboard" className="transition-opacity hover:opacity-80">
              <Logo size={28} withText={false} />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell align="right" />
            <ThemeToggle />
            <Link
              href="/profile"
              aria-label="Profil"
              className="rounded-full transition-opacity hover:opacity-80"
            >
              <Avatar name={user.name} src={user.avatarUrl} size={30} />
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-20 md:px-8 md:pt-8 md:pb-8">{children}</main>
      </div>
      <MobileTabBar tabs={tabs} />
      <BugAssistant />
    </div>
    </LocaleProvider>
  );
}
