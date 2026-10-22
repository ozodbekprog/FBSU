import { prisma } from "@/lib/prisma";
import {
  facultyBreakdown,
  FIN_YEARS,
  type FacultyBreakdown,
  type FacultyRow,
} from "./faculty-rates";

export { FIN_YEARS };

export type FacultyBreakdownData = {
  rows: FacultyBreakdown[];
  faculties: FacultyRow[];
  /** facultyId -> admin belgilagan summa */
  rates: Record<string, number>;
};

/**
 * Fakultetlar bo'yicha shartnoma hisob-kitoblari.
 * Talabalar User.facultyId orqali, shartnomalar esa o'quv yili bo'yicha bog'lanadi.
 */
export async function loadFacultyBreakdown(year: number): Promise<FacultyBreakdownData> {
  const [faculties, rateRows, students] = await Promise.all([
    prisma.faculty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.facultyContractRate.findMany({
      where: { year },
      select: { facultyId: true, amount: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        facultyId: true,
        group: { select: { facultyId: true } },
      },
    }),
  ]);

  const rates: Record<string, number> = {};
  for (const row of rateRows) rates[row.facultyId] = row.amount;

  // Talabaning fakulteti: avval bevosita User.facultyId, keyin guruh orqali
  // (Group.facultyId). Ko'p talabada fakultet guruhga biriktirilgan.
  const studentsByFaculty: Record<string, string[]> = {};
  for (const student of students) {
    const facultyId = student.facultyId ?? student.group?.facultyId ?? null;
    if (!facultyId) continue;
    (studentsByFaculty[facultyId] ??= []).push(student.id);
  }

  const contracts = await prisma.contract.findMany({
    where: { year },
    select: { id: true, studentId: true, amount: true },
  });

  const paidRows = await prisma.payment.groupBy({
    by: ["contractId"],
    where: { contractId: { in: contracts.map((contract) => contract.id) } },
    _sum: { amount: true },
  });
  const paidByContract = new Map(paidRows.map((row) => [row.contractId, row._sum.amount ?? 0]));

  const moneyByStudent = new Map<string, { amount: number; paid: number }>();
  for (const contract of contracts) {
    const current = moneyByStudent.get(contract.studentId) ?? { amount: 0, paid: 0 };
    current.amount += contract.amount;
    current.paid += paidByContract.get(contract.id) ?? 0;
    moneyByStudent.set(contract.studentId, current);
  }

  return {
    rows: facultyBreakdown({ faculties, rates, studentsByFaculty, moneyByStudent }),
    faculties,
    rates,
  };
}