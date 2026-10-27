import Link from "next/link";
import { APP_CHANNEL, APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

export function VersionBadge({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/versions"
      title={`v${APP_VERSION}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-amber-500" />
      <span className="uppercase tracking-wide">{APP_CHANNEL}</span>
      {compact ? null : (
        <span className="font-mono text-[10px] font-medium text-amber-700/80">v{APP_VERSION}</span>
      )}
    </Link>
  );
}
