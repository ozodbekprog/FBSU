import { Badge, Card, CardBody, CardHeader, EmptyState, Table } from "@/components/ui";

type Row = {
  id: string;
  studentName: string;
  groupName: string | null;
  courseTitle: string;
  points: number;
  reason: string;
  createdAt: string;
};

export function BonusLedger({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader
        title="Berilgan bonus ballar"
        subtitle={rows.length > 0 ? `${rows.length} ta yozuv` : "Hozircha yozuv yo'q"}
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            title="Bonus ballar yo'q"
            description="O'qituvchi fan tanlab, o'quvchiga ball bera boshlaganida bu yerda ro'yxat paydo bo'ladi."
          />
        ) : (
          <div className="-mx-6 overflow-x-auto">
            <Table>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-2 font-medium">O&apos;quvchi</th>
                  <th className="px-3 py-2 font-medium">Fan</th>
                  <th className="px-3 py-2 font-medium">Ball</th>
                  <th className="px-3 py-2 font-medium">Sabab</th>
                  <th className="px-6 py-2 font-medium">Sana</th>
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