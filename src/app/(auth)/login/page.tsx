"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { useIsClient } from "@/lib/use-is-client";

const DEMO_ACCOUNTS = [
  {
    roleKey: "roleRector" as const,
    email: "rektor@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8Z" />
        <path d="M6 19h12" />
      </svg>
    ),
  },
  {
    roleKey: "roleProRector" as const,
    email: "prorektor@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="m12 3 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.3-4.2 6-.9L12 3Z" />
      </svg>
    ),
  },
  {
    roleKey: "roleDean" as const,
    email: "dekan@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 21v-4h6v4" />
        <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" />
      </svg>
    ),
  },
  {
    roleKey: "roleHead" as const,
    email: "kafedra@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    roleKey: "roleRegistrar" as const,
    email: "registrar@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M4 4h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
  {
    roleKey: "payRoleBuxgalter" as const,
    email: "buxgalter@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M8 6h8" />
        <path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
        <path d="M8 19h4" />
      </svg>
    ),
  },
  {
    roleKey: "roleTutor" as const,
    email: "tyutor@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    roleKey: "roleStaff" as const,
    email: "xodim@ttpu.uz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M2 13h20" />
      </svg>
    ),
  },
  {
    roleKey: "authRoleAdmin" as const,
    email: "admin@ttpu.uz",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    roleKey: "authRoleTeacher" as const,
    email: "t.prog@ttpu.uz",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M2 3h20" />
        <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
        <path d="m7 21 5-5 5 5" />
      </svg>
    ),
  },
  {
    roleKey: "authRoleStudent" as const,
    email: "ozodbek@ttpu.uz",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      </svg>
    ),
  },
  {
    roleKey: "roleParent" as const,
    email: "ota-ona@ttpu.uz",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M20.8 14.6a2.2 2.2 0 0 0-2.9-3.2l-.4.4-.4-.4a2.2 2.2 0 0 0-2.9 3.2l3.3 3.3 3.3-3.3Z" />
      </svg>
    ),
  },
];

const PANEL_FEATURES = [
  "authLoginFeature1",
  "authLoginFeature2",
  "authLoginFeature3",
] as const;

const PANEL_STATS = [
  { value: "12k+", labelKey: "authLoginStatStudents" as const },
  { value: "450+", labelKey: "authLoginStatCourses" as const },
  { value: "98%", labelKey: "authLoginStatSatisfaction" as const },
];

export default function LoginPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const hydrated = useIsClient();
  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("ttpu1234");
    setError(null);
    void loginWith(demoEmail, "ttpu1234");
  }

  async function loginWith(
    emailValue: string,
    passwordValue: string,
    rememberValue = false,
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: emailValue,
          password: passwordValue,
          remember: rememberValue,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("authLoginError"));
        return;
      }
      const nextParam = new URLSearchParams(window.location.search).get("next");
      const target = json?.tempPasswordUsed === true
        ? "/profile?password=1"
        : nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : "/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWith(email, password, remember);
  }

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:gap-12 lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_90%_70%_at_20%_0%,black,transparent_80%)]" />
        <div className="pointer-events-none absolute -left-24 top-24 size-80 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-8 size-72 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex rounded-2xl bg-white p-2.5 shadow-lift">
            <Logo size={40} />
          </span>
          <h2 className="mt-10 max-w-md text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            {t("authLoginPanelTitle")}
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-brand-200">
            {t("authLoginPanelSubtitle")}
          </p>
          <ul className="mt-8 space-y-3.5">
            {PANEL_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-brand-100">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 size-4 shrink-0 text-gold-400"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {t(feature)}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
          {PANEL_STATS.map((stat) => (
            <div key={stat.labelKey}>
              <p className="text-2xl font-semibold tracking-tight text-white">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-brand-300">
                {t(stat.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-3">
            <div className="lg:hidden">
              <Logo size={44} />
            </div>
            <LanguageSwitcher locale={locale} className="ml-auto" />
            <ThemeToggle />
          </div>
          <Card className="mt-6 p-7 sm:p-9">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-950">
                {t("authLoginTitle")}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {t("authLoginSubtitle")}
              </p>
            </div>
            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <Label>{t("authEmail")}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("authEmailPlaceholder")}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label>{t("authPassword")}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("authPasswordPlaceholder")}
                    autoComplete="current-password"
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("authHidePassword") : t("authShowPassword")}
                    aria-pressed={showPassword}
                    title={showPassword ? t("authHidePassword") : t("authShowPassword")}
                    className="absolute -inset-y-1.5 right-0 flex w-11 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      {showPassword ? (
                        <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.4 1.9-1.1 2.9" />
                          <path d="M6.6 6.7C4.3 8.1 2.7 10.1 2.7 12c0 2.5 4 7 9.3 7 1.4 0 2.7-.4 3.8-1" />
                          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                        </>
                      ) : (
                        <>
                          <path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1.1" />
                          <path d="M21.5 12s-1 1.8-2.8 3.3" />
                          <path d="M12 18.5c-5 0-9.5-6.5-9.5-6.5" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-4 shrink-0 rounded border-slate-300 accent-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    />
                    <span>{t("authLoginRemember")}</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-brand-700 transition-colors duration-150 hover:text-brand-900 hover:underline"
                  >
                    {t("authLoginForgot")}
                  </Link>
                </div>
              </div>
              {error ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 size-4 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  <p>{error}</p>
                </div>
              ) : null}
              <Button type="submit" disabled={loading || !hydrated} size="lg" className="h-11 w-full">
                {loading ? t("authLoginSubmitting") : t("authLoginSubmit")}
              </Button>
            </form>
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
                  {t("authDemoTitle")}
                </span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account.email)}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-3 transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors duration-150 group-hover:bg-brand-100">
                      {account.icon}
                    </span>
                    <span className="text-center text-xs font-medium leading-tight text-slate-700 group-hover:text-brand-800">
                      {t(account.roleKey)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-600">
                {t("authDemoHint")}
              </p>
            </div>
            <p className="mt-7 text-center text-sm text-slate-500">
              {t("authLoginNoAccount")}{" "}
              <Link
                href="/register"
                className="font-medium text-brand-700 transition-colors duration-150 hover:text-brand-900 hover:underline"
              >
                {t("authLoginRegister")}
              </Link>
            </p>
          </Card>
          <p className="mt-6 text-center text-xs text-slate-600">
            {t("authLoginTerms")}
          </p>
        </div>
      </section>
    </main>
  );
}
