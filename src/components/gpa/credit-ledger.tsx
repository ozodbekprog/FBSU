import { Avatar, Card, CardBody } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";

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
    <Card className="overflow-hidden border-gold-500/20">
      <div className="relative border-b border-slate-100 bg-white px-4 py-4 sm:px-6 dark:border-white/10 dark:bg-white/[0.02]">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-600 via-gold-400 to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#211a0e] to-[#5a4517] text-gold-300 ring-1 ring-gold-500/30">
              <DiamondIcon size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">
                {dictionary.grdCreditLedger}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {rows.length > 0
                  ? translate(locale, "grdCreditLedgerCount", { count: rows.length })
                  : dictionary.grdNoRecordsYet}
              </p>
            </div>
          </div>
          {rows.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-300/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-gold-800 dark:text-gold-300">
              <DiamondIcon size={11} />
              {translate(locale, "grdCreditsInline", { count: totalCredits.toFixed(2) })}
            </span>
          ) : undefined}
        </div>
      </div>

      {rows.length === 0 ? (
        <CardBody>
          <div className="relative overflow-hidden rounded-2xl border border-gold-500/25 bg-[linear-gradient(150deg,#fffdf6_0%,#faf3e0_100%)] px-6 py-9 text-center dark:bg-none dark:bg-white/[0.03]">
            <span className="pointer-events-none absolute -right-6 -top-10 size-28 rounded-full bg-gold-300/25 blur-2xl" />
            <span className="relative inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#211a0e] to-[#5a4517] text-gold-300 shadow-md ring-1 ring-gold-500/30">
              <DiamondIcon size={22} />
            </span>
            <p className="relative mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {dictionary.grdNoCredits}
            </p>
            <p className="relative mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
              {dictionary.grdNoCreditsDesc}
            </p>
          </div>
        </CardBody>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {rows.map((row) => (
            <li
              key={row.id}
              className="group relative flex gap-3 px-4 py-4 transition-colors duration-150 hover:bg-gold-300/[0.07] sm:px-6"
            >
              <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-gradient-to-b from-gold-500 to-gold-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

              <div className="relative mt-0.5 shrink-0">
                <Avatar name={row.studentName} size={38} color="#d4af37" />
                <span className="absolute -bottom-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-[#2a2113] to-[#6d5016] text-gold-300 ring-2 ring-white dark:ring-slate-950">
                  <DiamondIcon size={9} />
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
                  <div className="shrink-0 rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-300/25 via-gold-300/10 to-transparent px-2.5 py-1.5 text-right">
                    <p className="text-sm font-semibold leading-none tabular-nums text-gold-800 dark:text-gold-300">
                      +{row.credits.toFixed(2)}
                    </p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-gold-700/80 dark:text-gold-300/70">
                      {dictionary.grdCreditLower}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-300/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gold-800 dark:text-gold-300">
                    {dictionary.grdCreditVipBadge}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span className="size-1.5 rounded-full bg-gold-500" />
                    {row.awardedByName}
                  </span>
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

function DiamondIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M6 3h12l4 7-10 11L2 10l4-7Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
