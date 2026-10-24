import { Card } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { HelpIcon } from "./icons";
import type { HelpIconName } from "./icons";
import { HelpSection } from "./section";

type ContactChannel = {
  icon: HelpIconName;
  title: string;
  value: string;
  href?: string;
  hint: string;
  tone: string;
};

export async function ContactCards() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  const CONTACTS: ContactChannel[] = [
    {
      icon: "mail",
      title: dictionary.mscHelpContactAcademicTitle,
      value: "academic.department@polito.uz",
      href: "mailto:academic.department@polito.uz",
      hint: dictionary.mscHelpContactAcademicHint,
      tone: "bg-brand-50 text-brand-700 ring-brand-100",
    },
    {
      icon: "mapPin",
      title: dictionary.mscHelpContactTutorTitle,
      value: dictionary.mscHelpContactTutorValue,
      hint: dictionary.mscHelpContactTutorHint,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
  ];

  const CHECKLIST = [
    dictionary.mscHelpContactCheck1,
    dictionary.mscHelpContactCheck2,
    dictionary.mscHelpContactCheck3,
  ];

  return (
    <HelpSection
      id="aloqa"
      icon="mail"
      title={dictionary.mscHelpContactTitle}
      description={dictionary.mscHelpContactDesc}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {CONTACTS.map((channel) => (
          <Card
            key={channel.title}
            className="flex flex-col p-5"
          >
            <span className={`inline-flex size-10 items-center justify-center rounded-xl ring-1 ${channel.tone}`}>
              <HelpIcon name={channel.icon} size={19} />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {channel.title}
            </p>
            {channel.href ? (
              <a
                href={channel.href}
                className="group/link mt-1 inline-flex items-center gap-1 font-semibold tracking-tight text-brand-800 transition-colors hover:text-brand-950"
              >
                <span className="break-all">{channel.value}</span>
                <HelpIcon
                  name="arrowRight"
                  size={14}
                  className="shrink-0 -translate-x-1 opacity-0 transition-[transform,translate,opacity] duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100"
                />
              </a>
            ) : (
              <p className="mt-1 font-semibold tracking-tight text-brand-800">{channel.value}</p>
            )}
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{channel.hint}</p>
          </Card>
        ))}
        <Card className="relative overflow-hidden border-brand-200/70 bg-gradient-to-br from-brand-50 via-white to-brand-50 p-5">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
          <span className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-brand-500/15 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-14 left-6 size-32 rounded-full bg-gold-400/10 blur-2xl" />
          <div className="relative">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800 ring-1 ring-brand-200">
              <HelpIcon name="shield" size={19} />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
              {dictionary.mscHelpContactBeforeTitle}
            </p>
            <p className="mt-1 font-semibold tracking-tight text-brand-950">
              {dictionary.mscHelpContactBeforeDesc}
            </p>
            <ul className="mt-3 space-y-2">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <HelpIcon
                    name="check"
                    size={15}
                    className="mt-0.5 shrink-0 text-gold-700 dark:text-gold-300"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </HelpSection>
  );
}
