import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const FINANCE_VIEW_ROLES: Role[] = [
  "ADMIN",
  "REGISTRAR",
  "REKTOR",
  "PRO_RECTOR",
];

export function canViewFinanceSection(role: string): boolean {
  return FINANCE_VIEW_ROLES.includes(role as Role);
}

export type FinanceYearKpi = {
  year: number;
  contractCount: number;
  contractTotal: number;
  paidTotal: number;
  debtTotal: number;
};

export type FinanceKpi = {
  contractCount: number;
  contractTotal: number;
  paidTotal: number;
  debtTotal: number;
  debtorsCount: number;
  byYear: FinanceYearKpi[];
};

export function formatMoney(value: number): string {
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

export async function getFinanceKpis(): Promise<FinanceKpi> {
  const contracts = await prisma.contract.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, studentId: true, year: true, amount: true },
  });

  const [paidSums, paidTotalAgg] = await Promise.all([
    paidSumsByContract(contracts.map((contract) => contract.id)),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  const paidTotal = paidTotalAgg._sum.amount ?? 0;
  const contractTotal = contracts.reduce((sum, contract) => sum + contract.amount, 0);
  const debtTotal = Math.max(0, contractTotal - paidTotal);

  const debtors = new Set<string>();
  const yearMap = new Map<number, FinanceYearKpi>();
  for (const contract of contracts) {
    const paid = paidSums.get(contract.id) ?? 0;
    const debt = contract.amount - paid;
    if (debt > 0) debtors.add(contract.studentId);
    const bucket = yearMap.get(contract.year) ?? {
      year: contract.year,
      contractCount: 0,
      contractTotal: 0,
      paidTotal: 0,
      debtTotal: 0,
    };
    bucket.contractCount += 1;
    bucket.contractTotal += contract.amount;
    bucket.paidTotal += paid;
    bucket.debtTotal += Math.max(0, debt);
    yearMap.set(contract.year, bucket);
  }

  const byYear = Array.from(yearMap.values()).sort((a, b) => b.year - a.year);

  return {
    contractCount: contracts.length,
    contractTotal,
    paidTotal,
    debtTotal,
    debtorsCount: debtors.size,
    byYear,
  };
}
