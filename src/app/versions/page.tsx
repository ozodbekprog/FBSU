import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { VersionBadge } from "@/components/version/version-badge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { fmtDate } from "@/lib/utils";
import { APP_CHANNEL, APP_RELEASED_AT, APP_VERSION, RELEASES } from "@/lib/version";

export const metadata: Metadata = {
  title: "Versiyalar — FBSU LMS",
  description: "FBSU LMS relizlari tarixi va o'zgarishlar ro'yxati",
};

export default async function VersionsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <div className="max-sm:hidden">
              <VersionBadge compact />
            </div>
            <ThemeToggle />
            {user ? (
              <ButtonLink href="/dashboard" size="sm">
                {dictionary.navDashboard}
              </ButtonLink>
            ) : (
              <ButtonLink href="/login" size="sm">
                {dictionary.authLoginLink}
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold" className="uppercase tracking-wide">
            {APP_CHANNEL === "beta" ? dictionary.verBeta : dictionary.verStable}
          </Badge>
          <span className="font-mono text-sm font-semibold text-brand-950">v{APP_VERSION}</span>
          <span className="text-xs text-slate-500">
            {dictionary.verReleased}: {fmtDate(APP_RELEASED_AT, locale)}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-950 sm:text-4xl">
          {dictionary.verTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{dictionary.verSubtitle}</p>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
          {dictionary.verBetaNotice}{" "}
          <Link href={user ? "/help" : "/login"} className="font-semibold underline underline-offset-2">
            {dictionary.navHelp}
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            {dictionary.verHistory}
          </h2>
          <span className="text-xs text-slate-400">
            {dictionary.verReleaseCount.replace("{count}", String(RELEASES.length))}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {RELEASES.map((release) => {
            const current = release.version === APP_VERSION;
            return (
              <article
                key={release.version}
                className={
                  current
                    ? "rounded-2xl border border-brand-200 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(29,52,96,0.35)]"
                    : "rounded-2xl border border-slate-200 bg-white p-6"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold text-brand-950">
                      v{release.version}
                    </span>
                    <Badge tone={release.channel === "beta" ? "amber" : "green"}>
                      {release.channel === "beta" ? dictionary.verBeta : dictionary.verStable}
                    </Badge>
                    {current ? <Badge tone="brand">{dictionary.verCurrentTag}</Badge> : null}
                  </div>
                  <span className="text-xs text-slate-400">{fmtDate(release.date, locale)}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{release.title}</h3>
                <ul className="mt-3 space-y-2">
                  {release.changes.map((change) => (
                    <li key={change} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold-500" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span>
            {dictionary.verCurrent}: <span className="font-mono">v{APP_VERSION}</span>
          </span>
          <Link href={user ? "/dashboard" : "/"} className="font-medium text-brand-700 hover:underline">
            {dictionary.verHome}
          </Link>
        </div>
      </main>
    </div>
  );
}
