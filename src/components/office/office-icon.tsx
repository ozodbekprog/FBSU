import type { OfficeType } from "@/lib/office";
import { cn } from "@/lib/utils";

export function OfficeIcon({ type, className }: { type: OfficeType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      {type === "word" ? (
        <>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
          <path d="M14 2v5h5" />
          <path d="M8 12h8" />
          <path d="M8 16h6" />
          <path d="M8 8h3" />
        </>
      ) : null}
      {type === "sheets" ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </>
      ) : null}
      {type === "slides" ? (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M12 16v4" />
          <path d="M8 20h8" />
          <path d="M8 8h8" />
          <path d="M8 11h5" />
        </>
      ) : null}
    </svg>
  );
}
