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

type LoginResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  challengeId?: string;
  expiresAt?: string;
  deviceName?: string;
  location?: string;
  telegramLinked?: boolean;
  verified?: boolean;
  devices?: ApprovalDevice[];
  tempPasswordUsed?: boolean;
  user?: { id: string; name: string; role: string };
  data?: { twoFactor?: boolean; loginId?: string; verified?: boolean; devices?: ApprovalDevice[] };
};

type OwnerChallenge = { loginId: string; email: string };

type ApprovalDevice = {
  id: string;
  name: string;
  platform: string | null;
  browser: string | null;
  lastSeenAt: string;
  ip: string | null;
  location: string;
};

type ApprovalState = {
  challengeId: string;
  expiresAt: string;
  deviceName?: string;
  location?: string;
};

function formatDeviceDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")}`;
}

function approvalText(locale: string) {
  if (locale === "ru") {
    return {
      title: "Подтверждение нового устройства",
      codeSent: "Код подтверждения отправлен в ваш Telegram.",
      codeLabel: "Код из Telegram",
      verify: "Подтвердить",
      devicesTitle: "Отключите одно из старых устройств",
      devicesHint: "Чтобы войти с нового устройства, выберите одно из подключённых и отключите его.",
      complete: "Отключить выбранное и войти",
      expires: "Код действует 5 минут.",
      selectFirst: "Сначала выберите устройство",
    };
  }
  if (locale === "en") {
    return {
      title: "New device verification",
      codeSent: "A verification code has been sent to your Telegram.",
      codeLabel: "Code from Telegram",
      verify: "Verify",
      devicesTitle: "Disconnect one of your old devices",
      devicesHint: "To sign in from the new device, select one of the connected devices and disconnect it.",
      complete: "Disconnect selected and sign in",
      expires: "The code is valid for 5 minutes.",
      selectFirst: "Select a device first",
    };
  }
  return {
    title: "Yangi qurilmani tasdiqlash",
    codeSent: "Tasdiqlash kodi Telegramingizga yuborildi.",
    codeLabel: "Telegramdan kelgan kod",
    verify: "Tasdiqlash",
    devicesTitle: "Eski qurilmalardan birini uzing",
    devicesHint: "Yangi qurilmadan kirish uchun ulangan qurilmalardan bittasini tanlab, uni uzish shart.",
    complete: "Tanlangan qurilmani uzish va kirish",
    expires: "Kod 5 daqiqa amal qiladi.",
    selectFirst: "Avval qurilmani tanlang",
  };
}

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
  const [challenge, setChallenge] = useState<OwnerChallenge | null>(null);
  const [ownerCode, setOwnerCode] = useState("");
  const [approval, setApproval] = useState<ApprovalState | null>(null);
  const [approvalStep, setApprovalStep] = useState<"code" | "devices">("code");
  const [approvalCode, setApprovalCode] = useState("");
  const [approvalDevices, setApprovalDevices] = useState<ApprovalDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const hydrated = useIsClient();
  const approvalLabels = approvalText(locale);

  function nextTarget() {
    const nextParam = new URLSearchParams(window.location.search).get("next");
    return nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";
  }

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
      const json = (await res.json().catch(() => null)) as LoginResponse | null;
      if (json?.code === "DEVICE_APPROVAL_REQUIRED" && json.challengeId) {
        setApproval({
          challengeId: json.challengeId,
          expiresAt: json.expiresAt ?? "",
          deviceName: json.deviceName,
          location: json.location,
        });
        setApprovalStep("code");
        setApprovalCode("");
        setApprovalDevices([]);
        setSelectedDevice("");
        setApprovalError(null);
        setError(null);
        return;
      }
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("authLoginError"));
        return;
      }
      setApproval(null);
      const loginId = json.data?.loginId;
      if (json.data?.twoFactor === true && typeof loginId === "string") {
        setChallenge({ loginId, email: emailValue.toLowerCase().trim() });
        setOwnerCode("");
        return;
      }
      router.push(json?.tempPasswordUsed === true ? "/profile?password=1" : nextTarget());
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOwnerCode(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    if (!/^\d{6}$/.test(ownerCode)) {
      setError("6 xonali kodni kiriting");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/owner-verify", {
        method: "POST",
        body: JSON.stringify({
          loginId: challenge.loginId,
          email: challenge.email,
          code: ownerCode,
        }),
      });
      const json = (await res.json().catch(() => null)) as LoginResponse | null;
      if (json?.code === "DEVICE_APPROVAL_REQUIRED" && json.challengeId) {
        setChallenge(null);
        setApproval({
          challengeId: json.challengeId,
          expiresAt: json.expiresAt ?? "",
          deviceName: json.deviceName,
          location: json.location,
        });
        setApprovalStep("devices");
        setApprovalDevices(Array.isArray(json.devices) ? json.devices : []);
        setSelectedDevice("");
        setApprovalError(null);
        setOwnerCode("");
        return;
      }
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Kod tasdiqlanmadi");
        return;
      }
      router.push(nextTarget());
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  function cancelChallenge() {
    setChallenge(null);
    setOwnerCode("");
    setError(null);
  }

  async function verifyApproval() {
    if (!approval || approvalBusy) return;
    if (!/^\d{6}$/.test(approvalCode)) {
      setApprovalError("Kod 6 xonali bo'lishi kerak");
      return;
    }
    setApprovalBusy(true);
    setApprovalError(null);
    try {
      const res = await apiFetch("/api/auth/device-approval/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId: approval.challengeId, code: approvalCode }),
      });
      const json = (await res.json().catch(() => null)) as LoginResponse | null;
      if (!res.ok || !json?.ok) {
        setApprovalError(json?.error ?? "Kod tasdiqlanmadi");
        return;
      }
      setApprovalDevices(Array.isArray(json.data?.devices) ? json.data.devices : []);
      setSelectedDevice("");
      setApprovalStep("devices");
    } catch {
      setApprovalError(t("commonNetworkError"));
    } finally {
      setApprovalBusy(false);
    }
  }

  async function completeApproval() {
    if (!approval || approvalBusy) return;
    if (!selectedDevice) {
      setApprovalError(approvalLabels.selectFirst);
      return;
    }
    setApprovalBusy(true);
    setApprovalError(null);
    try {
      const res = await apiFetch("/api/auth/device-approval/complete", {
        method: "POST",
        body: JSON.stringify({ challengeId: approval.challengeId, deviceId: selectedDevice }),
      });
      const json = (await res.json().catch(() => null)) as LoginResponse | null;
      if (!res.ok || !json?.ok) {
        setApprovalError(json?.error ?? "Qurilma almashtirilmadi");
        return;
      }
      window.location.assign(nextTarget());
    } catch {
      setApprovalError(t("commonNetworkError"));
    } finally {
      setApprovalBusy(false);
    }
  }

  function cancelApproval() {
    setApproval(null);
    setApprovalCode("");
    setApprovalDevices([]);
    setSelectedDevice("");
    setApprovalError(null);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWith(email, password, remember);
  }

  const errorNotice = error ? (
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
  ) : null;

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
            {challenge ? (
              <form onSubmit={verifyOwnerCode} className="mt-8 space-y-5">
                <div className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
                  <p className="font-medium">Telegramga yuborilgan 6 xonali kod</p>
                  <p className="mt-1 text-xs text-brand-700">
                    {challenge.email} uchun kod 5 daqiqa amal qiladi.
                  </p>
                </div>
                <div>
                  <Label htmlFor="login-owner-code">Tasdiqlash kodi</Label>
                  <Input
                    id="login-owner-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={ownerCode}
                    onChange={(e) => setOwnerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="text-center tracking-[0.45em]"
                    required
                  />
                </div>
                {errorNotice}
                <Button
                  type="submit"
                  disabled={loading || !hydrated || ownerCode.length !== 6}
                  size="lg"
                  className="h-11 w-full"
                >
                  {loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
                </Button>
                <button
                  type="button"
                  onClick={cancelChallenge}
                  className="w-full text-center text-xs font-medium text-brand-700 transition-colors duration-150 hover:text-brand-900 hover:underline"
                >
                  Orqaga
                </button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div>
                  <Label htmlFor="login-email">{t("authEmail")}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("authEmailPlaceholder")}
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">{t("authPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
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
                {errorNotice}
                {approval ? (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-950">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4"
                      >
                        <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      {approvalLabels.title}
                    </p>
                    {approvalStep === "code" ? (
                      <>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {approvalLabels.codeSent}
                        </p>
                        {approval.deviceName ? (
                          <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-600">
                            {approval.deviceName}
                            {approval.location ? ` · ${approval.location}` : ""}
                          </p>
                        ) : null}
                        <Label className="mt-3" htmlFor="login-approval-code">
                          {approvalLabels.codeLabel}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="login-approval-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={approvalCode}
                            placeholder="6 xonali kod"
                            className="font-semibold tracking-[0.35em]"
                            onChange={(event) =>
                              setApprovalCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void verifyApproval();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            className="shrink-0"
                            disabled={approvalBusy || approvalCode.length !== 6}
                            onClick={() => void verifyApproval()}
                          >
                            {approvalLabels.verify}
                          </Button>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">{approvalLabels.expires}</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-3 text-sm font-semibold text-brand-950">
                          {approvalLabels.devicesTitle}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {approvalLabels.devicesHint}
                        </p>
                        <div className="mt-3 space-y-2">
                          {approvalDevices.map((device) => {
                            const selected = selectedDevice === device.id;
                            return (
                              <label
                                key={device.id}
                                className={
                                  selected
                                    ? "block cursor-pointer rounded-xl border border-brand-500 bg-white p-3 ring-4 ring-brand-500/10"
                                    : "block cursor-pointer rounded-xl border border-slate-200 bg-white/80 p-3 transition hover:border-brand-300"
                                }
                              >
                                <input
                                  type="radio"
                                  name="approval-device"
                                  className="sr-only"
                                  checked={selected}
                                  onChange={() => setSelectedDevice(device.id)}
                                />
                                <span className="flex items-start justify-between gap-3">
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-slate-800">
                                      {device.name}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                      {[device.platform, device.browser].filter(Boolean).join(" · ") || "—"}
                                    </span>
                                    <span className="mt-1 block text-[11px] text-slate-500">
                                      {device.location} · {device.ip ?? "—"}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-slate-400">
                                      {formatDeviceDate(device.lastSeenAt)}
                                    </span>
                                  </span>
                                  <span
                                    className={
                                      selected
                                        ? "mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-600"
                                        : "mt-1 inline-flex size-4 shrink-0 rounded-full border-2 border-slate-300"
                                    }
                                  >
                                    {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <Button
                          type="button"
                          className="mt-3 w-full"
                          disabled={!selectedDevice || approvalBusy}
                          onClick={() => void completeApproval()}
                        >
                          {approvalLabels.complete}
                        </Button>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                          Tanlangan qurilma darhol tizimdan chiqariladi va uning sessiyasi yopiladi.
                        </p>
                      </>
                    )}
                    {approvalError ? (
                      <p className="mt-2 text-xs font-medium text-rose-700">{approvalError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={cancelApproval}
                      className="mt-3 w-full text-center text-xs font-medium text-brand-700 transition-colors duration-150 hover:text-brand-900 hover:underline"
                    >
                      Orqaga
                    </button>
                  </div>
                ) : null}
                {approval ? null : (
                  <Button type="submit" disabled={loading || !hydrated} size="lg" className="h-11 w-full">
                    {loading ? t("authLoginSubmitting") : t("authLoginSubmit")}
                  </Button>
                )}
              </form>
            )}
            {challenge || approval ? null : (
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
            )}
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
