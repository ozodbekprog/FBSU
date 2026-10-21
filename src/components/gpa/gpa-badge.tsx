import { cn } from "@/lib/utils";
import type { GpaLetter } from "@/app/api/gpa/data";

const BADGE_SIZES = {
  sm: "size-7 text-[11px]",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

export const LETTER_META: Record<
  GpaLetter,
  { gradient: string; soft: string; bar: string }
> = {
  A: {
    gradient:
      "bg-gradient-to-br from-gold-300 to-gold-500 text-brand-950 shadow-gold-500/30",
    soft: "border-gold-300/70 bg-gold-300/15 text-gold-800",
    bar: "bg-gold-400",
  },
  B: {
    gradient: "bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-brand-500/30",
    soft: "border-brand-200/70 bg-brand-50 text-brand-700",
    bar: "bg-brand-400",
  },
  C: {
    gradient: "bg-gradient-to-br from-brand-300 to-brand-500 text-white shadow-brand-500/30",
    soft: "border-brand-200/70 bg-brand-50 text-brand-700",
    bar: "bg-brand-300",
  },
  D: {
    gradient: "bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-slate-500/30",
    soft: "border-slate-200/70 bg-slate-100 text-slate-700",
    bar: "bg-slate-400",
  },
  F: {
    gradient: "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/30",
    soft: "border-rose-200/70 bg-rose-50 text-rose-700",
    bar: "bg-rose-400",
  },
};

export function LetterBadge({
  letter,
  size = "md",
  className,
}: {
  letter: GpaLetter;
  size?: keyof typeof BADGE_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold shadow-sm",
        BADGE_SIZES[size],
        LETTER_META[letter].gradient,
        className,
      )}
    >
      {letter}
    </span>
  );
}

export function gpaPointsTone(points: number) {
  if (points >= 4) return LETTER_META.A.gradient;
  if (points >= 3.3) return LETTER_META.B.gradient;
  if (points >= 2.7) return LETTER_META.C.gradient;
  if (points >= 2) return LETTER_META.D.gradient;
  return LETTER_META.F.gradient;
}

export function GpaPointsBadge({
  points,
  size = "md",
  digits = 1,
  className,
}: {
  points: number;
  size?: keyof typeof BADGE_SIZES;
  digits?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums shadow-sm",
        BADGE_SIZES[size],
        gpaPointsTone(points),
        className,
      )}
    >
      {points.toFixed(digits)}
    </span>
  );
}
