import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AwardHeroStat = {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
};

type HeroIcon = "bonus" | "credit";
type BadgeIcon = "spark" | "shield" | "user";
type HeroTone = "blue" | "gold";

export function AwardHero({
  eyebrow,
  title,
  subtitle,
  badge,
  stats,
  icon = "bonus",
  tone,
  cardValue,
  cardLabel,
  cardEyebrow,
  holder,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  stats: AwardHeroStat[];
  icon?: HeroIcon;
  tone?: HeroTone;
  cardValue?: ReactNode;
  cardLabel?: string;
  cardEyebrow?: string;
  holder?: string;
}) {
  const resolvedTone: HeroTone = tone ?? (icon === "credit" ? "gold" : "blue");

  return (
    <section className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_28px_64px_-40px_rgba(29,52,96,0.4)] dark:border-white/10 dark:bg-slate-950/50">
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
      <span
        className={cn(
          "pointer-events-none absolute -right-24 -top-28 size-80 rounded-full blur-3xl",
          resolvedTone === "blue" ? "bg-brand-400/25" : "bg-gold-400/20",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute -bottom-36 -left-24 size-80 rounded-full blur-3xl",
          resolvedTone === "blue" ? "bg-sky-300/25" : "bg-amber-200/30",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          resolvedTone === "blue" ? "via-brand-500/60" : "via-gold-500/70",
        )}
      />

      <div className="relative p-5 sm:p-7 md:pr-[21rem] lg:pr-[24rem]">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          <span
            className={cn(
              "size-1.5 rounded-full",
              resolvedTone === "blue" ? "bg-brand-600" : "bg-gold-500",
            )}
          />
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-2xl text-[26px] font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-[32px] dark:text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
        {badge ? <div className="mt-4 flex min-w-0 max-w-full flex-wrap gap-2">{badge}</div> : null}

        <div className="mt-5 md:hidden">
          <HeroVisualCard
            tone={resolvedTone}
            icon={icon}
            value={cardValue}
            label={cardLabel}
            eyebrow={cardEyebrow}
            holder={holder}
            compact
          />
        </div>
      </div>

      <div className="pointer-events-none hidden md:absolute md:right-7 md:top-8 md:block lg:right-10 lg:top-10">
        <HeroVisualCard
          tone={resolvedTone}
          icon={icon}
          value={cardValue}
          label={cardLabel}
          eyebrow={cardEyebrow}
          holder={holder}
        />
      </div>

      <div className="relative px-5 pb-5 sm:px-7 sm:pb-7">
        <div className="grid grid-cols-1 divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 items-center justify-between gap-3 px-4 py-2.5 sm:block sm:px-5 sm:py-3.5"
            >
              <p className="min-w-0 truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.1em] text-slate-500 sm:text-[10px] sm:tracking-[0.12em] dark:text-slate-400">
                {stat.label}
              </p>
              <p
                className={cn(
                  "shrink-0 text-lg font-semibold tabular-nums tracking-tight sm:mt-1 sm:truncate sm:text-2xl",
                  stat.accent
                    ? resolvedTone === "blue"
                      ? "text-brand-800 dark:text-brand-300"
                      : "text-gold-800 dark:text-gold-300"
                    : "text-slate-950 dark:text-white",
                )}
              >
                {stat.value}
              </p>
              {stat.hint ? (
                <p className="mt-0.5 hidden truncate text-[10px] text-slate-500 sm:block dark:text-slate-500">
                  {stat.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AwardHeroBadge({
  children,
  icon = "spark",
  tone = "blue",
}: {
  children: ReactNode;
  icon?: BadgeIcon;
  tone?: HeroTone | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
        tone === "gold"
          ? "border-gold-500/30 bg-gold-300/15 text-gold-800 dark:text-gold-300"
          : tone === "neutral"
            ? "border-slate-200 bg-white/80 text-slate-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300"
            : "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-300",
      )}
    >
      {icon === "shield" ? <ShieldIcon /> : icon === "user" ? <UserIcon /> : <SparkIcon />}
      {children}
    </span>
  );
}

function HeroVisualCard({
  tone,
  icon,
  value,
  label,
  eyebrow,
  holder,
  compact,
}: {
  tone: HeroTone;
  icon: HeroIcon;
  value?: ReactNode;
  label?: string;
  eyebrow?: string;
  holder?: string;
  compact?: boolean;
}) {
  const isCredit = icon === "credit";

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-2xl text-white shadow-[0_30px_60px_-28px_rgba(2,6,23,0.65)] ring-1 ring-white/10",
        compact ? "min-h-[9.5rem] p-4" : "min-h-[11.5rem] w-[18.5rem] p-5",
        isCredit
          ? "bg-[linear-gradient(135deg,#141009_0%,#2a2113_52%,#6d5016_100%)]"
          : "bg-[linear-gradient(135deg,#0a1d3d_0%,#163968_55%,#2f6fbc_100%)]",
      )}
    >
      <span className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -right-4 -top-8 size-32 rounded-full border border-white/10" />
      <span
        className={cn(
          "pointer-events-none absolute -left-16 bottom-0 size-40 rounded-full blur-2xl",
          isCredit ? "bg-gold-400/25" : "bg-sky-300/25",
        )}
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.3em] text-white/90">FBSU</p>
          {eyebrow ? (
            <p className="mt-0.5 line-clamp-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {eyebrow}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border",
            isCredit
              ? "border-gold-300/30 bg-gold-300/10 text-gold-300"
              : "border-white/20 bg-white/10 text-white",
          )}
        >
          {isCredit ? <CreditMarkSmall /> : <BonusMarkSmall />}
        </span>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-semibold tabular-nums tracking-tight",
              compact ? "text-2xl" : "text-[28px]",
              isCredit ? "text-gold-300" : "text-white",
            )}
          >
            {value ?? "FBSU"}
          </p>
          {label ? (
            <p className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-[0.16em] text-white/55">
              {label}
            </p>
          ) : null}
        </div>
        <div className={cn("shrink-0", isCredit ? "text-gold-300/70" : "text-white/60")}>
          <ChipMark />
        </div>
      </div>

      <div className="relative mt-3 flex items-end justify-between gap-3 border-t border-white/10 pt-2.5">
        <div className="min-w-0">
          {holder ? (
            <>
              <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-white/40">
                {icon === "credit" ? "VIP MEMBER" : "WALLET HOLDER"}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">
                {holder}
              </p>
            </>
          ) : (
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
              FBSU · LMS
            </p>
          )}
        </div>
        <span className="shrink-0 text-[8px] font-semibold tracking-[0.18em] text-white/40">
          2026
        </span>
      </div>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.4 2.9 8.2 7 9.5 4.1-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" />
    </svg>
  );
}

function BonusMarkSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
    </svg>
  );
}

function CreditMarkSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12l3.5 6.5L12 21 2.5 9.5 6 3Z" />
      <path d="M2.5 9.5h19" />
    </svg>
  );
}

function ChipMark() {
  return (
    <svg
      width="26"
      height="20"
      viewBox="0 0 26 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="24" height="18" rx="3" />
      <path d="M9 1v18M17 1v18M1 7h24M1 13h24" opacity="0.65" />
    </svg>
  );
}
