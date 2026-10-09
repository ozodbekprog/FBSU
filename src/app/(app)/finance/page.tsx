import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Stat, Table } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { fmtDateTime } from "@/lib/utils";
import FinanceBoard, {
  type FinanceContractItem,
  type FinancePaymentItem,
  type FinanceStudentOption,
} from "@/components/finance/finance-board";

const VIEW_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];

const METHOD_LABELS: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Plastik",
  BANK: "Bank",
};

function money(value: number) {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return rounded < 0 ? `-${grouped}` : grouped;
}

async function paidSumsByContract(contractIds: string[]) {
  const sums = new Map<string, number>();
  if (contractIds.length === 0) return sums;
  const grouped = await prisma.payment.groupBy({
    by: ["contractId"],
    where: { contractId: { in: contractIds } },
    _sum: { amount: true },
  });
  for (const row of grouped) {
    if (row.contractId) sums.set(row.contractId, row._sum.amount ?? 0);
  }
  return sums;
}

export default async function FinancePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  if (user.role === "STUDENT") {
    const contracts = await prisma.contract.findMany({
      where: { studentId: user.id },
      orderBy: { year: "desc" },
    });
    const paidSums = await paidSumsByContract(contracts.map((contract) => contract.id));
    const payments = await prisma.payment.findMany({
      where: { studentId: user.id },
      orderBy: { paidAt: "desc" },
      take: 200,
    });

    const contractTotal = contracts.reduce((sum, contract) => sum + contract.amount, 0);
    const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const debtTotal = Math.max(0, contractTotal - paidTotal);

    return (
      <>
        <PageHeader title={dictionary.finMyContract} subtitle={dictionary.finSubtitle} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label={dictionary.finAmount} value={money(contractTotal)} />
          <Stat label={dictionary.finPaid} value={money(paidTotal)} />
          <Stat label={dictionary.finDebt} value={money(debtTotal)} />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader title={dictionary.finContract} subtitle={contracts.length} />
            <CardBody>
              {contracts.length === 0 ? (
                <EmptyState title={dictionary.finEmpty} />
              ) : (
                <div className="-mx-6 overflow-x-auto">
                  <Table>
                    <thead>
                      <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                        <th className="px-6 py-2 font-medium">{dictionary.finYear}</th>
                        <th className="px-3 py-2 font-medium">{dictionary.finAmount}</th>
                        <th className="px-3 py-2 font-medium">{dictionary.finPaid}</th>
                        <th className="px-6 py-2 font-medium">{dictionary.finDebt}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contracts.map((contract) => {
                        const paid = paidSums.get(contract.id) ?? 0;
                        const debt = contract.amount - paid;
                        return (
                          <tr key={contract.id} className="text-sm text-slate-700">
                            <td className="px-6 py-3 font-medium text-slate-900">
                              {contract.year}
                            </td>
                            <td className="px-3 py-3">{money(contract.amount)}</td>
                            <td className="px-3 py-3 text-emerald-600">{money(paid)}</td>
                            <td
                              className={
                                debt > 0
                                  ? "px-6 py-3 font-medium text-rose-600"
                                  : "px-6 py-3 font-medium text-slate-500"
                              }
                            >
                              {money(debt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={dictionary.finPayments} subtitle={payments.length} />
            <CardBody>
              {payments.length === 0 ? (
                <EmptyState title={dictionary.finEmpty} />
              ) : (
                <div className="-mx-6 overflow-x-auto">
                  <Table>
                    <thead>
                      <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                        <th className="px-6 py-2 font-medium">{dictionary.grdDate}</th>
                        <th className="px-3 py-2 font-medium">{dictionary.finAmount}</th>
                        <th className="px-6 py-2 font-medium">{dictionary.finMethod}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="text-sm text-slate-700">
                          <td className="px-6 py-3 text-slate-600">
                            {fmtDateTime(payment.paidAt)}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-900">
                            {money(payment.amount)}
                          </td>
                          <td className="px-6 py-3">
                            <Badge
                              tone={
                                payment.method === "CASH"
                                  ? "green"
                                  : payment.method === "CARD"
                                    ? "blue"
                                    : "purple"
                              }
                            >
                              {METHOD_LABELS[payment.method] ?? payment.method}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </>
    );
  }

  if (!VIEW_ROLES.includes(user.role)) redirect("/dashboard");

  const canManage = user.role === "ADMIN" || user.role === "REGISTRAR";

  const contracts = await prisma.contract.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
    },
  });
  const paidSums = await paidSumsByContract(contracts.map((contract) => contract.id));

  const contractItems: FinanceContractItem[] = contracts.map((contract) => {
    const paid = paidSums.get(contract.id) ?? 0;
    return {
      id: contract.id,
      studentId: contract.studentId,
      studentName: contract.student.name,
      groupName: contract.student.group?.name ?? null,
      year: contract.year,
      amount: contract.amount,
      paid,
      debt: contract.amount - paid,
      note: contract.note,
      createdAt: contract.createdAt.toISOString(),
    };
  });

  const studentOptions: FinanceStudentOption[] = canManage
    ? (
        await prisma.user.findMany({
          where: { role: "STUDENT", isActive: true },
          orderBy: { name: "asc" },
          take: 300,
          select: { id: true, name: true, group: { select: { name: true } } },
        })
      ).map((student) => ({
        id: student.id,
        name: student.name,
        groupName: student.group?.name ?? null,
      }))
    : [];

  const payments = await prisma.payment.findMany({
    orderBy: { paidAt: "desc" },
    take: 50,
    include: {
      student: { select: { id: true, name: true, group: { select: { name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  const paymentItems: FinancePaymentItem[] = payments.map((payment) => ({
    id: payment.id,
    studentId: payment.studentId,
    studentName: payment.student.name,
    groupName: payment.student.group?.name ?? null,
    amount: payment.amount,
    method: payment.method,
    note: payment.note,
    paidAt: payment.paidAt.toISOString(),
    createdAt: payment.createdAt.toISOString(),
  }));

  const contractTotal = contractItems.reduce((sum, contract) => sum + contract.amount, 0);
  const paidTotalAgg = await prisma.payment.aggregate({ _sum: { amount: true } });
  const paidTotal = paidTotalAgg._sum.amount ?? 0;
  const debtTotal = Math.max(0, contractTotal - paidTotal);

  return (
    <>
      <PageHeader title={dictionary.finTitle} subtitle={dictionary.finSubtitle} />
      <FinanceBoard
        contracts={contractItems}
        students={studentOptions}
        payments={paymentItems}
        canManage={canManage}
        stats={{ contractCount: contractItems.length, contractTotal, paidTotal, debtTotal }}
      />
    </>
  );
}
