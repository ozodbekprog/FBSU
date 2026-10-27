// Fakultetlar bo'yicha shartnoma summalari va Moliya hisob-kitoblari.

/** Moliya moduli qo'llab-quvvatlaydigan o'quv yillari. */
export const FIN_YEARS = [2024, 2025, 2026, 2027];

export type FacultyRow = {
  id: string;
  name: string;
  code: string | null;
};

/** Talaba bo'yicha (o'quv yili) yig'ilgan shartnoma ma'lumotlari. */
export type StudentMoney = {
  amount: number;
  paid: number;
};

export type FacultyBreakdown = {
  facultyId: string;
  name: string;
  code: string | null;
  /** Admin belgilagan bitta shartnoma summasi (0 — belgilanmagan). */
  rate: number;
  /** Fakultetdagi shartnomalik talabalar soni. */
  students: number;
  /** rate * students — fakultetdan kutilayotgan jami. */
  expected: number;
  /** Bazadagi haqiqiy shartnomalar jami. */
  contracted: number;
  /** To'langan jami. */
  paid: number;
  /** contracted - paid (musbat = qarz). */
  debt: number;
  /** contracted - expected (musbat = kam shartnoma). */
  gapToExpected: number;
};

export type FacultyBreakdownInput = {
  faculties: FacultyRow[];
  /** facultyId -> belgilangan summa. */
  rates: Record<string, number>;
  /** facultyId -> talaba user id'lari. */
  studentsByFaculty: Record<string, string[]>;
  /** userId -> { amount, paid } */
  moneyByStudent: Map<string, StudentMoney>;
};

export function facultyBreakdown(input: FacultyBreakdownInput): FacultyBreakdown[] {
  const { faculties, rates, studentsByFaculty, moneyByStudent } = input;

  return faculties
    .map((faculty) => {
      const rate = rates[faculty.id] ?? 0;
      const studentIds = studentsByFaculty[faculty.id] ?? [];
      const students = studentIds.length;
      const expected = rate * students;

      let contracted = 0;
      let paid = 0;
      for (const studentId of studentIds) {
        const money = moneyByStudent.get(studentId);
        if (!money) continue;
        contracted += money.amount;
        paid += money.paid;
      }

      return {
        facultyId: faculty.id,
        name: faculty.name,
        code: faculty.code,
        rate,
        students,
        expected,
        contracted,
        paid,
        debt: contracted - paid,
        gapToExpected: contracted - expected,
      };
    })
    .sort((a, b) => b.contracted - a.contracted || a.name.localeCompare(b.name));
}

/** Barcha fakultetlar bo'yicha jami. */
export function breakdownTotals(rows: FacultyBreakdown[]) {
  return rows.reduce(
    (acc, row) => ({
      students: acc.students + row.students,
      expected: acc.expected + row.expected,
      contracted: acc.contracted + row.contracted,
      paid: acc.paid + row.paid,
      debt: acc.debt + row.debt,
    }),
    { students: 0, expected: 0, contracted: 0, paid: 0, debt: 0 },
  );
}