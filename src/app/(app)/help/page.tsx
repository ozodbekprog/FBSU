import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { HelpIcon } from "@/components/help/icons";
import type { HelpIconName } from "@/components/help/icons";
import { QuickStart } from "@/components/help/quick-start";
import type { QuickStartStep } from "@/components/help/quick-start";
import { FaqList } from "@/components/help/faq";
import type { FaqItem } from "@/components/help/faq";
import { BotCommands } from "@/components/help/bot-commands";
import type { BotCommand } from "@/components/help/bot-commands";
import { ContactCards } from "@/components/help/contact";
import { RichText } from "@/components/help/rich-text";
import { TourRestart } from "@/components/tour/tour-restart";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return {
    title: dictionary.mscHelpMetaTitle,
    description: dictionary.mscHelpMetaDescription,
  };
}

export default async function HelpPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const user = await getCurrentUser();

  const QUICK_LINKS: { href: string; label: string; hint: string; icon: HelpIconName }[] = [
    {
      href: "#boshlash",
      label: dictionary.mscHelpQuickStartLink,
      hint: dictionary.mscHelpQuickStartLinkHint,
      icon: "sparkles",
    },
    { href: "#faq", label: dictionary.mscHelpFaqLink, hint: dictionary.mscHelpFaqLinkHint, icon: "help" },
    { href: "#bot", label: dictionary.mscHelpBotLink, hint: dictionary.mscHelpBotLinkHint, icon: "send" },
    {
      href: "#aloqa",
      label: dictionary.mscHelpContactLink,
      hint: dictionary.mscHelpContactLinkHint,
      icon: "mail",
    },
  ];

  const STEPS: QuickStartStep[] = [
    {
      title: dictionary.mscHelpStep1Title,
      description: dictionary.mscHelpStep1Desc,
      href: "/login",
      linkLabel: dictionary.mscHelpStep1Link,
      icon: "login",
    },
    {
      title: dictionary.mscHelpStep2Title,
      description: dictionary.mscHelpStep2Desc,
      href: "/courses",
      linkLabel: dictionary.mscHelpStep2Link,
      icon: "book",
    },
    {
      title: dictionary.mscHelpStep3Title,
      description: dictionary.mscHelpStep3Desc,
      href: "/courses",
      linkLabel: dictionary.mscHelpStep3Link,
      icon: "clipboard",
    },
    {
      title: dictionary.mscHelpStep4Title,
      description: dictionary.mscHelpStep4Desc,
      href: "/quizzes",
      linkLabel: dictionary.mscHelpStep4Link,
      icon: "listChecks",
    },
    {
      title: dictionary.mscHelpStep5Title,
      description: dictionary.mscHelpStep5Desc,
      href: "/attendance/check-in",
      linkLabel: dictionary.mscHelpStep5Link,
      icon: "qr",
    },
    {
      title: dictionary.mscHelpStep6Title,
      description: dictionary.mscHelpStep6Desc,
      href: "#bot",
      linkLabel: dictionary.mscHelpStep6Link,
      icon: "send",
    },
  ];

  const FAQ: FaqItem[] = [
    {
      id: "parol",
      question: dictionary.mscHelpFaqPasswordQ,
      answer: (
        <div className="space-y-2.5">
          <p>
            <RichText text={dictionary.mscHelpFaqPasswordA1} />
          </p>
          <p>
            <RichText text={dictionary.mscHelpFaqPasswordA2} />
          </p>
        </div>
      ),
    },
    {
      id: "davomat-foizi",
      question: dictionary.mscHelpFaqAttendanceQ,
      answer: (
        <div className="space-y-3">
          <p>{dictionary.mscHelpFaqAttendanceIntro}</p>
          <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-center font-medium text-brand-800 ring-1 ring-brand-100">
            {dictionary.mscHelpFaqAttendanceFormula}
          </p>
          <p>
            <RichText text={dictionary.mscHelpFaqAttendanceNote} />
          </p>
        </div>
      ),
    },
    {
      id: "qr",
      question: dictionary.mscHelpFaqQrQ,
      answer: (
        <div className="space-y-2.5">
          <p>
            <RichText text={dictionary.mscHelpFaqQrA1} />
          </p>
          <p>{dictionary.mscHelpFaqQrA2}</p>
        </div>
      ),
    },
    {
      id: "telegram",
      question: dictionary.mscHelpFaqTelegramQ,
      answer: (
        <div className="space-y-2.5">
          <p>
            <RichText text={dictionary.mscHelpFaqTelegramA1} />
          </p>
          <p>
            <RichText text={dictionary.mscHelpFaqTelegramA2} />
          </p>
        </div>
      ),
    },
    {
      id: "sertifikat",
      question: dictionary.mscHelpFaqCertQ,
      answer: (
        <div className="space-y-2.5">
          <p>
            <RichText text={dictionary.mscHelpFaqCertA1} />
          </p>
          <p>
            <RichText text={dictionary.mscHelpFaqCertA2} />
          </p>
        </div>
      ),
    },
    {
      id: "xatolar",
      question: dictionary.mscHelpFaqSupportQ,
      answer: (
        <div className="space-y-2.5">
          <p>
            <RichText text={dictionary.mscHelpFaqSupportA1} />
          </p>
          <p>{dictionary.mscHelpFaqSupportA2}</p>
        </div>
      ),
    },
  ];

  const BOT_COMMANDS: BotCommand[] = [
    {
      command: "/start",
      description: dictionary.mscHelpBotStartDesc,
      result: dictionary.mscHelpBotStartResult,
    },
    {
      command: "/jadval",
      description: dictionary.mscHelpBotScheduleDesc,
      result: dictionary.mscHelpBotScheduleResult,
    },
    {
      command: "/ertaga",
      description: dictionary.mscHelpBotTomorrowDesc,
      result: dictionary.mscHelpBotTomorrowResult,
    },
    {
      command: "/hafta",
      description: dictionary.mscHelpBotWeekDesc,
      result: dictionary.mscHelpBotWeekResult,
    },
    {
      command: "/davomat",
      description: dictionary.mscHelpBotAttendanceDesc,
      result: dictionary.mscHelpBotAttendanceResult,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={dictionary.mscHelpEyebrow}
        title={dictionary.mscHelpTitle}
        subtitle={dictionary.mscHelpSubtitle}
      />

      <section className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-5 py-8 shadow-lift md:px-8 md:py-10">
        <span className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-brand-500/25 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">
            {dictionary.mscHelpHeroEyebrow}
          </p>
          <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {dictionary.mscHelpHeroTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-200">
            {dictionary.mscHelpHeroText}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10 transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 hover:bg-white/10 hover:ring-white/20"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-100 ring-1 ring-white/10 transition-colors group-hover:text-gold-300">
                  <HelpIcon name={link.icon} size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{link.label}</span>
                  <span className="block truncate text-xs text-brand-200">{link.hint}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-14">
        <QuickStart steps={STEPS} />
        {user?.role === "STUDENT" ? <TourRestart /> : null}
        <FaqList items={FAQ} />
        <BotCommands commands={BOT_COMMANDS} />
        <ContactCards />
      </div>

      <p className="pt-10 text-center text-xs text-slate-600">
        {dictionary.mscHelpUpdated}{" "}
        <a href="mailto:academic.department@polito.uz" className="hover:text-brand-600 hover:underline">
          academic.department@polito.uz
        </a>
      </p>
    </>
  );
}
