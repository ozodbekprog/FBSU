import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { BetaBadge } from "@/components/brand/beta-badge";
import { LandingLoader } from "@/components/landing/landing-loader";
import { AppInstallButton } from "@/components/pwa/AppInstallButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getDictionary, getLocale } from "@/i18n";

const SITE_URL = "https://lms.ttpu.uz";
const OG_LOCALES: Record<string, string> = {
  uz: "uz_UZ",
  "uz-new": "uz_UZ",
  "uz-cyrl": "uz_UZ",
  ru: "ru_RU",
  en: "en_US",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      title: dictionary.metaTitle,
      description: dictionary.metaDescription,
      siteName: "FBSU",
      locale: OG_LOCALES[locale],
    },
    twitter: {
      card: "summary",
      title: dictionary.metaTitle,
      description: dictionary.metaDescription,
    },
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Turin Polytechnic University",
        alternateName: "FBSU",
        url: SITE_URL,
        email: "info@ttpu.uz",
        telephone: "+998 71 289 99 00",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tashkent",
          addressCountry: "UZ",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "FBSU",
        url: SITE_URL,
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  const navLinks = [
    { href: "#imkoniyatlar", label: dictionary.landNavFeatures },
    { href: "#boshlash", label: dictionary.landNavStart },
    { href: "#ilova", label: dictionary.landNavApp },
    { href: "#statistika", label: dictionary.landNavStats },
    { href: "#aloqa", label: dictionary.landNavContact },
  ];

  const trustItems = [
    dictionary.landTrust1,
    dictionary.landTrust2,
    dictionary.landTrust3,
  ];

  const features = [
    {
      title: dictionary.landFeat1Title,
      description: dictionary.landFeat1Desc,
      badge: null as string | null,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat2Title,
      description: dictionary.landFeat2Desc,
      badge: null as string | null,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat3Title,
      description: dictionary.landFeat3Desc,
      badge: null as string | null,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat4Title,
      description: dictionary.landFeat4Desc,
      badge: dictionary.landBadgeNew,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M3 3v18h18" />
          <path d="m7 14 4-4 3 3 5-6" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat5Title,
      description: dictionary.landFeat5Desc,
      badge: dictionary.landBadgeNew,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat6Title,
      description: dictionary.landFeat6Desc,
      badge: dictionary.landBadgeNew,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat7Title,
      description: dictionary.landFeat7Desc,
      badge: dictionary.landBadgeNew,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: dictionary.landFeat8Title,
      description: dictionary.landFeat8Desc,
      badge: null as string | null,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      ),
    },
  ];

  const stats = [
    { value: "20 000+", label: dictionary.landStatUsers },
    { value: "1 800+", label: dictionary.landStatCourses },
    { value: "120+", label: dictionary.landStatTeachers },
    { value: "24/7", label: dictionary.landStatSupport },
  ];

  const steps = [
    {
      title: dictionary.landStep1Title,
      description: dictionary.landStep1Desc,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      ),
    },
    {
      title: dictionary.landStep2Title,
      description: dictionary.landStep2Desc,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      title: dictionary.landStep3Title,
      description: dictionary.landStep3Desc,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="m5 3 14 9-14 9V3z" />
        </svg>
      ),
    },
  ];

  const footerModules = [
    dictionary.landFeat1Title,
    dictionary.landModAssignmentsTests,
    dictionary.landModGpaTranscript,
    dictionary.landFeat6Title,
    dictionary.landFeat7Title,
    dictionary.landFeat8Title,
  ];

  const footerPlatform = [
    { href: "#imkoniyatlar", label: dictionary.landNavFeatures },
    { href: "#boshlash", label: dictionary.landNavStart },
    { href: "/app", label: dictionary.landFooterApp },
    { href: "/login", label: dictionary.landFooterLogin },
    { href: "/register", label: dictionary.authLoginRegister },
    { href: "/help", label: dictionary.landFooterHelp },
  ];

  const appPoints = [
    dictionary.landAppPoint1,
    dictionary.landAppPoint2,
    dictionary.landAppPoint3,
  ];

  const appScreenRows = [
    {
      label: dictionary.navCourses,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      label: dictionary.navSchedule,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      label: dictionary.navMessages,
      icon: (
        <svg aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <LandingLoader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-800 focus:shadow-lg"
      >
        {dictionary.landSkipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80">
            <Logo />
            <BetaBadge className="max-sm:hidden" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap transition-colors duration-150 hover:text-brand-800"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ButtonLink href="/login" variant="ghost" size="sm" className="max-sm:hidden">
              {dictionary.authLoginLink}
            </ButtonLink>
            <ButtonLink href="/register" size="sm" className="whitespace-nowrap">
              {dictionary.authLoginRegister}
            </ButtonLink>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="pointer-events-none absolute -left-24 top-12 size-72 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -top-16 size-80 rounded-full bg-gold-300/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--color-brand-100)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-brand-100)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black,transparent_75%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 lg:py-28">
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <div className="landing-rise" style={{ animationDelay: "650ms" }}>
                <Badge tone="brand" className="gap-2 px-3.5 py-1.5 text-xs">
                  <span className="size-1.5 rounded-full bg-gold-400" />
                  {dictionary.landUniversity}
                </Badge>
              </div>
              <h1 className="landing-rise mt-6 text-4xl font-bold leading-tight tracking-tight text-brand-950 sm:text-5xl lg:text-[3.4rem]" style={{ animationDelay: "730ms" }}>
                {dictionary.landHeroTitleA}{" "}
                <span className="underline decoration-gold-400 decoration-2 underline-offset-[6px]">
                  {dictionary.landHeroTitleB}
                </span>
              </h1>
              <p className="landing-rise mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0" style={{ animationDelay: "810ms" }}>
                {dictionary.landHeroSubtitle}
              </p>
              <div className="landing-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start" style={{ animationDelay: "890ms" }}>
                <ButtonLink href="/login" size="lg" className="w-full min-w-44 sm:w-auto">
                  {dictionary.authLoginLink}
                </ButtonLink>
                <ButtonLink
                  href="/register"
                  variant="secondary"
                  size="lg"
                  className="w-full min-w-44 sm:w-auto"
                >
                  {dictionary.authLoginRegister}
                </ButtonLink>
              </div>
              <ul className="landing-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 lg:justify-start" style={{ animationDelay: "970ms" }}>
                {trustItems.map((item) => (
                  <li key={item} className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <svg aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4 text-emerald-500"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-rise relative mx-auto w-full max-w-xl" style={{ animationDelay: "600ms" }}>
              <div className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-tr from-brand-200/60 via-white to-gold-300/30 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="size-2.5 rounded-full bg-rose-300" />
                  <span className="size-2.5 rounded-full bg-gold-300" />
                  <span className="size-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-2 hidden h-5 flex-1 items-center rounded-md bg-slate-100 px-2.5 text-[11px] font-medium text-slate-600 sm:flex">
                    lms.ttpu.uz/dashboard
                  </span>
                  <span className="size-5 rounded-md bg-brand-50" />
                </div>
                <div className="overflow-hidden rounded-xl bg-[#0b1220]">
                  <img
                    src="/beta-dashboard.png"
                    alt="FBSU talaba dashboardi"
                    width={1200}
                    height={800}
                    className="block h-auto w-full"
                  />
                </div>
              </div>

              <div className="absolute -right-3 -top-6 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lift backdrop-blur sm:flex">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-gold-300/20 text-gold-800">
                  <svg aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{dictionary.landGpaShort}</p>
                  <p className="text-[11px] text-slate-600">{dictionary.landSemesterRating}</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-3 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lift backdrop-blur sm:flex">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <svg aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {dictionary.landAssignmentGraded}
                  </p>
                  <p className="text-[11px] text-slate-600">{dictionary.landMathScore}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="imkoniyatlar" className="py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                {dictionary.landNavFeatures}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                {dictionary.landFeaturesTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                {dictionary.landFeaturesSubtitle}
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="group flex h-full flex-col p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-200 group-hover:bg-brand-100">
                      {feature.icon}
                    </span>
                    {feature.badge ? <Badge tone="gold">{feature.badge}</Badge> : null}
                  </div>
                  <h3 className="mt-5 font-semibold tracking-tight text-brand-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="boshlash" className="border-y border-slate-200/70 bg-gradient-to-b from-white via-brand-50/50 to-white py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                {dictionary.landStartEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                {dictionary.landStartTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                {dictionary.landStartSubtitle}
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <Card
                  key={step.title}
                  className="group relative h-full overflow-hidden p-6"
                >
                  <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-200 group-hover:bg-brand-100">
                      {step.icon}
                    </span>
                    <span className="text-3xl font-bold tracking-tight text-slate-100">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-semibold tracking-tight text-brand-950">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </Card>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/register" size="lg" className="w-full min-w-44 sm:w-auto">
                {dictionary.landCreateAccount}
              </ButtonLink>
              <ButtonLink
                href="/login"
                variant="secondary"
                size="lg"
                className="w-full min-w-44 sm:w-auto"
              >
                {dictionary.landDemoLogin}
              </ButtonLink>
            </div>
          </div>
        </section>

        <section id="ilova" className="relative overflow-hidden py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
              <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                  {dictionary.landAppEyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
                  {dictionary.landAppTitle}
                </h2>
                <p className="mt-4 leading-relaxed text-slate-600">
                  {dictionary.landAppSubtitle}
                </p>
                <ul className="mx-auto mt-7 flex max-w-md flex-col gap-3 lg:mx-0">
                  {appPoints.map((point) => (
                    <li
                      key={point}
                      className="inline-flex items-center gap-2.5 text-left text-sm text-slate-600"
                    >
                      <svg aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4 shrink-0 text-emerald-500"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <AppInstallButton size="lg" withManualHint className="w-full min-w-44 sm:w-auto" />
                </div>
                <div className="mt-6 flex justify-center lg:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/70 bg-gold-300/15 px-3.5 py-1.5 text-xs font-medium text-gold-800">
                    <svg aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3.5"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    {dictionary.landAppSoonBadge}
                  </span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <div className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-gradient-to-tr from-brand-200/50 via-white to-gold-300/30 blur-2xl" />
                <div className="relative">
                  <div className="relative mx-auto w-[248px] rounded-[2.6rem] border border-slate-200 bg-brand-950 p-2 shadow-lift sm:w-[270px]">
                    <div className="overflow-hidden rounded-[2.15rem] bg-white">
                      <div className="relative bg-gradient-to-b from-brand-900 to-brand-700 px-5 pb-10 pt-8 text-center">
                        <img
                          src="/logo.svg"
                          alt=""
                          width={56}
                          height={56}
                          className="mx-auto rounded-2xl bg-white shadow-lg"
                        />
                        <p className="mt-3 text-base font-semibold text-white">FBSU</p>
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-200">
                          {dictionary.landAppEyebrow}
                        </p>
                      </div>
                      <div className="-mt-5 space-y-2 px-3.5 pb-4">
                        {appScreenRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-[0_8px_18px_-12px_rgba(29,52,96,0.35)]"
                          >
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                              {row.icon}
                            </span>
                            <span className="text-xs font-medium text-slate-700">{row.label}</span>
                            <span className="ml-auto size-1.5 rounded-full bg-gold-400" />
                          </div>
                        ))}
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-3 py-2.5 text-xs font-semibold text-brand-950">
                          <svg aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-3.5"
                          >
                            <path d="M12 3v12" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M5 21h14" />
                          </svg>
                          {dictionary.landAppInstall}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -left-6 top-24 hidden w-40 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lift sm:block lg:-left-10">
                    <p className="text-xs font-semibold text-brand-950">
                      {dictionary.landAppAndroid}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {dictionary.landAppAndroidNote}
                    </p>
                  </div>
                  <div className="absolute -right-6 bottom-24 hidden w-40 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lift sm:block lg:-right-10">
                    <p className="text-xs font-semibold text-brand-950">{dictionary.landAppIos}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      {dictionary.landAppIosNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="statistika" className="px-4 py-20 sm:px-6 sm:py-24">
          <h2 className="sr-only">{dictionary.landNavStats}</h2>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-900 px-6 py-14 sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-gold-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-brand-600/30 blur-3xl" />
            <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <span className="mx-auto block h-0.5 w-8 rounded-full bg-gold-400 sm:mx-0" />
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-brand-200">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-12 flex flex-col items-start justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
              <p className="max-w-xl text-sm leading-relaxed text-brand-200">
                {dictionary.landStatsNote}
              </p>
              <ButtonLink href="/register" variant="gold" size="lg" className="w-full sm:w-auto">
                {dictionary.landJoinNow}
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-brand-50 px-6 py-14 text-center sm:px-12">
            <Badge tone="gold">{dictionary.landReadyBadge}</Badge>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">
              {dictionary.landStartToday}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-600">
              {dictionary.landStartTodayText}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/login" size="lg" className="w-full min-w-44 sm:w-auto">
                {dictionary.landLoginCta}
              </ButtonLink>
              <ButtonLink
                href="/register"
                variant="secondary"
                size="lg"
                className="w-full min-w-44 sm:w-auto"
              >
                {dictionary.authLoginRegister}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer id="aloqa" className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
            <div>
              <Logo />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-500">
                {dictionary.landFooterAbout}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="brand">{dictionary.landBuiltWith}</Badge>
                <Badge tone="green">{dictionary.landSecure}</Badge>
                <Badge tone="slate">Open API</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-950">
                {dictionary.landFooterPlatform}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                {footerPlatform.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors duration-150 hover:text-brand-800"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-950">
                {dictionary.landFooterModules}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-500">
                {footerModules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-950">
                {dictionary.landFooterContact}
              </p>
              <ul className="mt-4 space-y-3.5 text-sm text-slate-500">
                <li className="flex items-center gap-2.5">
                  <svg aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 shrink-0 text-brand-500"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 6L2 7" />
                  </svg>
                  info@ttpu.uz
                </li>
                <li className="flex items-center gap-2.5">
                  <svg aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 shrink-0 text-brand-500"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  +998 71 289 99 00
                </li>
                <li className="flex items-start gap-2.5">
                  <svg aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 size-4 shrink-0 text-brand-500"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {dictionary.landAddress}
                </li>
                <li className="text-xs text-slate-600">{dictionary.landWorkHours}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
            <p className="text-xs text-slate-600">{dictionary.landRights}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
