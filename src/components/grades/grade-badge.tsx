import { cn } from "@/lib/utils";

const BADGE_SIZES = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
  xl: "size-24 text-2xl",
};

export function gradeBadgeTone(percent: number | null) {
  if (percent == null) return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70";
  if (percent >= 80)
    return "bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm shadow-brand-900/40";
  if (percent >= 60)
    return "bg-gradient-to-br from-gold-300 to-gold-600 text-brand-950 shadow-sm shadow-gold-500/30";
  return "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-sm shadow-rose-500/30";
}

export function GradeBadge({
  percent,
  size = "md",
  className,
}: {
  percent: number | null;
  size?: keyof typeof BADGE_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none tabular-nums",
        BADGE_SIZES[size],
        gradeBadgeTone(percent),
        className,
      )}
    >
      {percent != null ? `${percent}%` : "—"}
    </span>
  );
}
