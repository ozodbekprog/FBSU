// Moliya sahifasidagi qarz hisob-kitoblari.
// Komponentdan ajratilgan — test qilish uchun.

export type DebtContract = {
  studentId: string;
  amount: number;
  paid: number;
};

export type DebtTotals = {
  count: number;
  amount: number;
  paid: number;
  debt: number;
};

/** Bitta talabaning barcha shartnomalari bo'yicha jamlanma. */
export function studentTotals(
  contracts: DebtContract[],
  studentId: string,
): DebtTotals {
  const rows = contracts.filter((contract) => contract.studentId === studentId);
  const amount = rows.reduce((sum, contract) => sum + contract.amount, 0);
  const paid = rows.reduce((sum, contract) => sum + contract.paid, 0);
  return { count: rows.length, amount, paid, debt: amount - paid };
}

/**
 * Jamlanma qarz: faqat musbat qarzlar yig'iladi.
 * Bitta talabaning ortiqcha to'lovi boshqasining qarzini yashirmasligi kerak.
 */
export function totalDebt(contracts: DebtContract[]): number {
  return contracts.reduce(
    (sum, contract) => sum + Math.max(0, contract.amount - contract.paid),
    0,
  );
}

/** Ortiqcha to'langan summa (qarzdan tashqari ko'rsatiladi). */
export function totalOverpaid(contracts: DebtContract[]): number {
  return contracts.reduce(
    (sum, contract) => sum + Math.max(0, contract.paid - contract.amount),
    0,
  );
}

/** Qarzdor shartnomalar soni. */
export function debtorCount(contracts: DebtContract[]): number {
  return contracts.filter((contract) => contract.amount - contract.paid > 0).length;
}

/**
 * Kiritilayotgan to'lovdan keyingi qoldiq.
 * Manfiy qiymat — ortiqcha to'lov.
 */
export function remainingAfterPayment(debt: number, paymentAmount: number): number | null {
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return null;
  return debt - paymentAmount;
}
