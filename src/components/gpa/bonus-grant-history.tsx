import { Badge, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { formatPoints } from "@/lib/points";

export type BonusGrantRow = {
  id: string;
  courseTitle: string | null;
  totalTenths: number;
  allocatedTenths: number;
  remainingTenths: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
  allocations: { id: string; courseTitle: string; points: number }[];
};

export async function BonusGrantHistory({ rows }: { rows: BonusGrantRow[] }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const totalPoints = rows.reduce((sum, row) => sum + row.totalTenths, 0) / 10;

  function status(row: BonusGrantRow) {
    if (row.courseTitle) {
      return { tone: "blue" as const, label: dictionary.grdBonusStatusApplied };
    }
    if (row.remainingTenths <= 0) {
      return { tone: "green" as const, label: dictionary.grdBonusStatusUsed };
    }
    if (row.allocatedTenths > 0) {
      return { tone: "amber" as const, label: dictionary.grdBonusStatusPartial };
    }
    return { tone: "gold" as const, label: dictionary.grdBonusStatusWallet };
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={dictionary.grdBonusHistoryTitle}
        subtitle={
          rows.length > 0
            ? translate(locale, "grdBonusHistorySubtitle", {
                count: rows.length,
                points: formatPoints(totalPoints),
              })
            : dictionary.grdNoRecordsYet
        }
        action={
          rows.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-300/20 px-2.5 py-1 text-xs font-semibold tabular-nums text-gold-800 ring-1 ring-gold-500/30">
              {translate(locale, "grdBonusPlus", { points: formatPoints(totalPoints) })}
            </span>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <CardBody>
          <EmptyState
            title={dictionary.grdNoBonusPoints}
            description={dictionary.grdNoBonusPointsDesc}
          />
        </CardBody>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => {
            const badge = status(row);
            const isWallet = !row.courseTitle;
            return (
              <li
                key={row.id}
                className="flex gap-3 px-4 py-4 transition-colors duration-150 hover:bg-slate-50/70 sm:px-6"
              >
                <span
                  className={
                    isWallet
                      ? "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 text-white shadow-sm shadow-gold-700/20"
                      : "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-600 text-white shadow-sm shadow-brand-900/20"
                  }
                >
                  {isWallet ? <WalletIcon /> : <BookIcon />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.courseTitle ?? dictionary.grdBonusRectorGrant}
                        </p>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-gold-500" />
                          {row.awardedByName}
                        </span>
                        <span>{row.createdAt}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={
                          isWallet
                            ? "inline-flex items-center rounded-lg bg-gold-300/20 px-2 py-1 text-xs font-semibold tabular-nums text-gold-800 ring-1 ring-gold-500/30"
                            : "inline-flex items-center rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold tabular-nums text-brand-700 ring-1 ring-brand-200/60"
                        }
                      >
                        {translate(locale, "grdBonusPointsBadge", {
                          points: formatPoints(row.totalTenths / 10),
                        })}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {row.reason}
                  </p>

                  {isWallet ? (
                    <div className="mt-2.5 rounded-xl border border-gold-500/20 bg-gold-300/[0.08] px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gold-800">
                        <span>{dictionary.grdBonusAllocations}</span>
                        <span className="tabular-nums">
                          {translate(locale, "grdBonusUsedOf", {
                            used: formatPoints(row.allocatedTenths / 10),
                            total: formatPoints(row.totalTenths / 10),
                          })}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gold-500/15">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400"
                          style={{
                            width: `${Math.min(
                              100,
                              (row.allocatedTenths / Math.max(1, row.totalTenths)) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.allocations.length > 0 ? (
                          row.allocations.map((allocation) => (
                            <span
                              key={allocation.id}
                              className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-gold-500/20 dark:bg-white/[0.06] dark:text-slate-300"
                            >
                              <BookIcon small />
                              <span className="max-w-48 truncate">
                                {translate(locale, "grdBonusAllocatedTo", {
                                  course: allocation.courseTitle,
                                  points: formatPoints(allocation.points),
                                })}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {dictionary.grdBonusNoAllocations}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function WalletIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5" />
      <path d="M21 8.5h-4.5a3 3 0 0 0 0 6H21v-6Z" />
    </svg>
  );
}

function BookIcon({ small }: { small?: boolean }) {
  return (
    <svg
      width={small ? 10 : 15}
      height={small ? 10 : 15}
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
