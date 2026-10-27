import { Avatar, Card, CardBody, EmptyState } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { formatPoints } from "@/lib/points";

type Row = {
  id: string;
  studentName: string;
  groupName: string | null;
  courseTitle: string | null;
  points: number;
  remainingPoints: number;
  allocations: { id: string; courseTitle: string; points: number }[];
  reason: string;
  awardedByName: string;
  createdAt: string;
};

export async function BonusLedger({
  rows,
  showAwardedBy = false,
  title,
}: {
  rows: Row[];
  showAwardedBy?: boolean;
  title?: string;
}) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const totalPoints = rows.reduce((sum, row) => sum + row.points, 0);

  return (
    <Card className="overflow-hidden">
      <div className="relative border-b border-slate-100 bg-white px-4 py-4 sm:px-6 dark:border-white/10 dark:bg-white/[0.02]">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-800 via-brand-400 to-gold-400" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-600 text-white shadow-[0_8px_18px_-10px_rgba(19,31,60,0.9)]">
              <SparkIcon />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">
                {title ?? dictionary.grdGivenBonusPoints}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {rows.length > 0
                  ? translate(locale, "grdRecordsCount", { count: rows.length })
                  : dictionary.grdNoRecordsYet}
              </p>
            </div>
          </div>
          {rows.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-300">
              {translate(locale, "grdBonusPlus", { points: formatPoints(totalPoints) })}
            </span>
          ) : undefined}
        </div>
      </div>

      {rows.length === 0 ? (
        <CardBody>
          <EmptyState
            title={dictionary.grdNoBonusPoints}
            description={dictionary.grdNoBonusPointsDesc}
          />
        </CardBody>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {rows.map((row) => (
            <li
              key={row.id}
              className="group flex gap-3 px-4 py-4 transition-colors duration-150 hover:bg-brand-50/40 sm:px-6 dark:hover:bg-white/[0.03]"
            >
              <div className="relative mt-0.5 shrink-0">
                <Avatar name={row.studentName} size={38} />
                <span className="absolute -bottom-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-brand-800 text-white ring-2 ring-white dark:ring-slate-950">
                  <SparkIcon size={8} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {row.studentName}
                    </p>
                    {row.groupName ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{row.groupName}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-white px-2.5 py-1.5 text-right dark:border-brand-400/20 dark:from-brand-400/10 dark:to-transparent">
                    <p className="text-sm font-semibold leading-none tabular-nums text-brand-800 dark:text-brand-300">
                      +{formatPoints(row.points)}
                    </p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-brand-600/70 dark:text-brand-300/70">
                      {dictionary.grdBall}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {row.courseTitle ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      <SubjectIcon />
                      <span className="truncate">{row.courseTitle}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800 ring-1 ring-brand-200/70 dark:bg-brand-400/10 dark:text-brand-300 dark:ring-brand-400/20">
                      <WalletIcon />
                      {row.remainingPoints > 0
                        ? translate(locale, "grdBonusWalletChip", {
                            points: formatPoints(row.remainingPoints),
                          })
                        : dictionary.grdBonusStatusUsed}
                    </span>
                  )}
                  {row.allocations.map((allocation) => (
                    <span
                      key={allocation.id}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-gold-300/15 px-2 py-0.5 text-[11px] font-medium text-gold-800 dark:text-gold-300"
                    >
                      <SubjectIcon />
                      <span className="truncate">
                        {translate(locale, "grdBonusAllocatedTo", {
                          course: allocation.courseTitle,
                          points: formatPoints(allocation.points),
                        })}
                      </span>
                    </span>
                  ))}
                  {showAwardedBy ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      <span className="size-1.5 rounded-full bg-gold-400" />
                      {row.awardedByName}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-slate-500">{row.createdAt}</span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {row.reason}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SparkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
    </svg>
  );
}

function SubjectIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5" />
      <path d="M21 8.5h-4.5a3 3 0 0 0 0 6H21v-6Z" />
    </svg>
  );
}
