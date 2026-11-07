import { getDictionary, getLocale, t as translate } from "@/i18n";
import { formatPoints } from "@/lib/points";
import { initials } from "@/lib/utils";

type Row = {
  id: string;
  studentName: string;
  groupName: string | null;
  courseTitle: string | null;
  points: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
};

export async function BonusLedger({ rows }: { rows: Row[] }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const totalPoints = rows.reduce((sum, row) => sum + row.points, 0);

  return (
    <section className="fb-card">
      <div className="fb-card-head">
        <div className="fb-head-txt">
          <h3>{dictionary.grdGivenBonusPoints}</h3>
          <span className="fb-tagline">
            {rows.length > 0
              ? translate(locale, "grdRecordsCount", { count: rows.length })
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
          {rows.map((row) => (
            <div key={row.id} className="fb-rowl">
              <span className="fb-rowl-ava">{initials(row.studentName)}</span>

              <div className="fb-rowl-main">
                <div className="fb-rowl-name">
                  <span className="fb-rowl-nametxt">{row.studentName}</span>
                  {row.courseTitle ? (
                    <span className="fb-mini">
                      <SubjectIcon />
                      {row.courseTitle}
                    </span>
                  ) : null}
                </div>

                <div className="fb-rowl-sub">
                  {row.groupName ? (
                    <>
                      <span>{row.groupName}</span>
                      <i className="fb-dot" />
                    </>
                  ) : null}
                  <span>{row.awardedByName}</span>
                  <i className="fb-dot" />
                  <span>{row.createdAt}</span>
                </div>

                <p className="fb-rowl-reason">{row.reason}</p>
              </div>

              <div className="fb-rowl-right">
                <p className="fb-amt">
                  +{formatPoints(row.points)}
                  <small>{dictionary.grdBall}</small>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3Z" />
    </svg>
  );
}

function SubjectIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5V6a2 2 0 0 1 2-2h13v16H6a2 2 0 0 1-2-2Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" />
    </svg>
  );
}
