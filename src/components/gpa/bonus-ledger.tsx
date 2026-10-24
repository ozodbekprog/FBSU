import { Badge, Card, CardBody, CardHeader, EmptyState, Table } from "@/components/ui";
import { getDictionary, getLocale, t as translate } from "@/i18n";

type Row = {
  id: string;
  studentName: string;
  groupName: string | null;
  courseTitle: string;
  points: number;
  reason: string;
  createdAt: string;
};

export async function BonusLedger({ rows }: { rows: Row[] }) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <Card>
      <CardHeader
        title={dictionary.grdGivenBonusPoints}
        subtitle={
          rows.length > 0
            ? translate(locale, "grdRecordsCount", { count: rows.length })
            : dictionary.grdNoRecordsYet
        }
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            title={dictionary.grdNoBonusPoints}
            description={dictionary.grdNoBonusPointsDesc}
          />
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <Table>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-2 font-medium">{dictionary.grdPupil}</th>
                  <th className="px-3 py-2 font-medium">{dictionary.grdSubject}</th>
                  <th className="px-3 py-2 font-medium">{dictionary.grdScore}</th>
                  <th className="px-3 py-2 font-medium">{dictionary.grdReason}</th>
                  <th className="px-6 py-2 font-medium">{dictionary.grdDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="text-sm text-slate-700">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{row.studentName}</div>
                      {row.groupName ? (
                        <div className="text-xs text-slate-500">{row.groupName}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{row.courseTitle}</td>
                    <td className="px-3 py-3">
                      <Badge tone="blue">+{row.points.toFixed(1)}</Badge>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {translate(locale, "grdBonusPercent", {
                          percent: Math.round(row.points * 10),
                        })}
                      </div>
                    </td>
                    <td className="max-w-xs px-3 py-3 text-slate-600">{row.reason}</td>
                    <td className="px-6 py-3 text-xs text-slate-500">{row.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}