import { getDictionary, getLocale, t as translate } from "@/i18n";
import { initials } from "@/lib/utils";

type Row = {
  id: string;
  studentName: string;
  groupName: string | null;
  credits: number;
  reason: string;
  awardedByName: string;
  createdAt: string;
};

export async function CreditLedger({ rows }: { rows: Row[] }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const totalCredits = rows.reduce((sum, row) => sum + row.credits, 0);

  return (
    <section className="fb-card">
      <div className="fb-card-head">
        <div className="fb-head-txt">
          <h3>{dictionary.grdCreditLedger}</h3>
          <span className="fb-tagline">
            {rows.length > 0
              ? translate(locale, "grdCreditLedgerCount", { count: rows.length })
              : dictionary.grdNoRecordsYet}
          </span>
        </div>
        {rows.length > 0 ? (
          <span className="fb-mini">
            <DiamondIcon />
            {translate(locale, "grdCreditsInline", { count: totalCredits.toFixed(2) })}
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="fb-empty-box">
          <span className="fb-ava">
            <DiamondIcon />
          </span>
          <b>{dictionary.grdNoCredits}</b>
          <p>{dictionary.grdNoCreditsDesc}</p>
        </div>
      ) : (
        <div className="fb-rows">
          {rows.map((row) => (
            <div key={row.id} className="fb-rowl">
              <span className="fb-rowl-ava">{initials(row.studentName)}</span>

              <div className="fb-rowl-main">
                <div className="fb-rowl-name">
                  <span className="fb-rowl-nametxt">{row.studentName}</span>
                  <span className="fb-mini">{dictionary.grdCreditVipBadge}</span>
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
                  +{row.credits.toFixed(2)}
                  <small>{dictionary.grdCreditLower}</small>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12l4 7-10 11L2 10l4-7Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
