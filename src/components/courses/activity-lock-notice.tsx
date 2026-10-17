import { cn, fmtDateTime } from "@/lib/utils";

export function ActivityLockNotice({
  reason,
  availableFrom,
  availableTo,
}: {
  reason: "before" | "after";
  availableFrom: Date | null;
  availableTo: Date | null;
}) {
  const before = reason === "before";
  const date = before ? availableFrom : availableTo;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5",
        before ? "border-amber-200/80 bg-amber-50" : "border-rose-200/80 bg-rose-50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white",
          before ? "bg-amber-500" : "bg-rose-600",
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", before ? "text-amber-800" : "text-rose-700")}>
          {before ? "Bu topshiriq hali ochilmagan" : "Topshiriq muddati tugagan"}
        </p>
        {date ? (
          <p className={cn("mt-0.5 text-sm", before ? "text-amber-700/90" : "text-rose-600/90")}>
            {before ? `Ochilish: ${fmtDateTime(date)}` : `Tugash: ${fmtDateTime(date)}`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
