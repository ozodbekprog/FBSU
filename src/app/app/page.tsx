import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { AppInstallButton } from "@/components/pwa/AppInstallButton";
import { getDictionary, getLocale } from "@/i18n";
import { requestOrigin } from "@/lib/request-origin";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return {
    title: dictionary.mappMetaTitle,
    description: dictionary.mappMetaDescription,
    alternates: { canonical: "/app" },
    openGraph: {
      type: "website",
      url: "/app",
      siteName: "FBSU",
      title: dictionary.mappMetaTitle,
      description: dictionary.mappMetaDescription,
    },
    twitter: {
      card: "summary",
      title: dictionary.mappMetaTitle,
      description: dictionary.mappMetaDescription,
    },
  };
}

async function resolveOrigin(): Promise<string> {
  const headerList = await headers();
  return requestOrigin(new Request("http://internal/", { headers: headerList }));
}

function AndroidIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M6 10a6 6 0 0 1 12 0v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M8.5 5 7 2.5M15.5 5 17 2.5" />
      <path d="M6 11h12" />
    </svg>
  );
}

function AppleDeviceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <rect x="7" y="2" width="10" height="20" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default async function MobileAppPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const origin = await resolveOrigin();
  const qrDataUrl = await QRCode.toDataURL(`${origin}/app`, {
    width: 240,
    margin: 1,
    color: { dark: "#1d3460", light: "#ffffff" },
  });

  const androidSteps = [
    dictionary.mappAndroidStep1,
    dictionary.mappAndroidStep2,
    dictionary.mappAndroidStep3,
  ];
  const iosSteps = [dictionary.mappIosStep1, dictionary.mappIosStep2, dictionary.mappIosStep3];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 via-white to-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="transition-opacity duration-150 hover:opacity-80">
            <Logo />
          </Link>
          <ButtonLink href="/" variant="ghost" size="sm">
            {dictionary.mappBack}
          </ButtonLink>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-14 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge tone="brand" className="gap-2 px-3.5 py-1.5 text-xs">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {dictionary.mappBadge}
            </Badge>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
              {dictionary.mappTitle}
            </h1>
            <p className="mt-4 leading-relaxed text-slate-600">{dictionary.mappSubtitle}</p>
            <div className="mt-8 flex justify-center">
              <AppInstallButton size="lg" className="w-full max-w-64 sm:w-auto" />
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-2">
          <Card className="relative h-full overflow-hidden p-7">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-brand-500" />
            <div className="flex items-center gap-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <AndroidIcon />
              </span>
              <h2 className="font-semibold tracking-tight text-brand-950">
                {dictionary.mappAndroidTitle}
              </h2>
            </div>
            <ol className="mt-6 space-y-4">
              {androidSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-600">{step}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
              <ClockIcon />
              {dictionary.mappAndroidSoon}
            </p>
          </Card>

          <Card className="relative h-full overflow-hidden p-7">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-brand-500 to-gold-400" />
            <div className="flex items-center gap-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <AppleDeviceIcon />
              </span>
              <h2 className="font-semibold tracking-tight text-brand-950">
                {dictionary.mappIosTitle}
              </h2>
            </div>
            <ol className="mt-6 space-y-4">
              {iosSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-600">{step}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 space-y-2">
              <p className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
                <ClockIcon />
                {dictionary.mappIosSoon}
              </p>
              <p className="text-xs text-slate-500">{dictionary.mappIosNote}</p>
            </div>
          </Card>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
          <Card className="grid items-center gap-8 p-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-9">
            <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={dictionary.mappQrTitle} width={176} height={176} className="size-44" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold tracking-tight text-brand-950">
                {dictionary.mappQrTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{dictionary.mappQrText}</p>
            </div>
          </Card>

          <div className="relative mt-8 overflow-hidden rounded-3xl bg-brand-900 px-6 py-9 text-center sm:px-10">
            <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-brand-600/30 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-gold-300/10 px-3.5 py-1.5 text-xs font-medium text-gold-200">
                {dictionary.landAppSoonBadge}
              </span>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
                {dictionary.mappSoonTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-brand-200">
                {dictionary.mappSoonText}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <p className="text-xs text-slate-600">{dictionary.landRights}</p>
          <Link
            href="/"
            className="text-xs font-medium text-brand-700 transition-colors duration-150 hover:text-brand-900"
          >
            {dictionary.mappBack}
          </Link>
        </div>
      </footer>
    </div>
  );
}
