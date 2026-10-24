import { cn } from "@/lib/utils";

export function BetaBadge({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]",
        onDark
          ? "border-gold-300/30 bg-gold-300/10 text-gold-200"
          : "border-gold-400/40 bg-gold-400/10 text-gold-800 dark:text-gold-300",
        className,
      )}
    >
      <span className="size-1 rounded-full bg-gold-400" />
      Beta
    </span>
  );
}
