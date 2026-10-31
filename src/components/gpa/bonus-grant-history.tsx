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
    return { tone: "" as const, label: dictionary.grdBonusStatusWallet };
  }

  return (
    <section className="fb-card">
      <div className="fb-card-head">
        <div className="fb-head-txt">
          <h3>{dictionary.grdBonusHistoryTitle}</h3>
          <span className="fb-tagline">
            {rows.length > 0
              ? translate(locale, "grdBonusHistorySubtitle", {
                  count: rows.length,
                  points: formatPoints(totalPoints),
                })
              : dictionary.grdNoRecordsYet}
          </span>
        </div>
        {rows.length > 0 ? (
          <span className="fb-mini">
            {translate(locale, "grdBonusPlus", { points: formatPoints(totalPoints) })}
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="fb-empty-box">
          <span className="fb-ava">
            <SparkIcon />
          </span>
          <b>{dictionary.grdNoBonusPoints}</b>
          <p>{dictionary.grdNoBonusPointsDesc}</p>
        </div>
      ) : (
        <div className="fb-rows">
          {rows.map((row) => {
            const badge = status(row);
            const isWallet = !row.courseTitle;
            const usedPercent = Math.min(
              100,
              Math.round((row.allocatedTenths / Math.max(1, row.totalTenths)) * 100),
            );
            return (
              <div key={row.id} className="fb-rowl">
                <span className="fb-rowl-ava">
                  {isWallet ? <WalletIcon /> : <BookIcon />}
                </span>

                <div className="fb-rowl-main">
                  <div className="fb-rowl-name">
                    <span className="fb-rowl-nametxt">
                      {row.courseTitle ?? dictionary.grdBonusRectorGrant}
                    </span>
                    <span className={`fb-mini ${badge.tone}`}>{badge.label}</span>
                  </div>
                  <div className="fb-rowl-sub">
                    <span>{row.awardedByName}</span>
                    <span className="fb-dot" />
                    <span>{row.createdAt}</span>
                  </div>
                  <p className="fb-rowl-reason">{row.reason}</p>

                  {isWallet ? (
                    <div className="fb-rowl-alloc">
                      <div className="fb-wallet-top">
                        <span>
                          {translate(locale, "grdBonusUsedOf", {
                            used: formatPoints(row.allocatedTenths / 10),
                            total: formatPoints(row.totalTenths / 10),
                          })}
                        </span>
                        <b>{usedPercent}%</b>
                      </div>
                      <div className="fb-meter">
                        <i style={{ width: `${usedPercent}%` }} />
                      </div>
                      <div className="fb-rowl-tags">
                        {row.allocations.length > 0 ? (
                          row.allocations.map((allocation) => (
                            <span key={allocation.id} className="fb-mini">
                              <BookIcon />
                              <span className="fb-rowl-nametxt">
                                {translate(locale, "grdBonusAllocatedTo", {
                                  course: allocation.courseTitle,
                                  points: formatPoints(allocation.points),
                                })}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="fb-mini">{dictionary.grdBonusNoAllocations}</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="fb-rowl-right">
                  <span className="fb-amt">
                    +{formatPoints(row.totalTenths / 10)}
                    <small>{dictionary.grdBall}</small>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5" />
      <path d="M21 8.5h-4.5a3 3 0 0 0 0 6H21v-6Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
    </svg>
  );
}
