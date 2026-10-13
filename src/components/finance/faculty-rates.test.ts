import { describe, expect, it } from "vitest";
import {
  breakdownTotals,
  facultyBreakdown,
  type FacultyRow,
} from "./faculty-rates";

const KI: FacultyRow = { id: "ki", name: "Kompyuter injiniringi", code: "KI" };
const FF: FacultyRow = { id: "ff", name: "Fizika-fan", code: "FF" };

const money = (amount: number, paid: number) => ({ amount, paid });

describe("fakultetlar bo'yicha hisob", () => {
  it("summa x students = kutilayotgan jami", () => {
    const rows = facultyBreakdown({
      faculties: [KI],
      rates: { ki: 10_000_000 },
      studentsByFaculty: { ki: ["s1", "s2", "s3"] },
      moneyByStudent: new Map([
        ["s1", money(10_000_000, 0)],
        ["s2", money(10_000_000, 4_000_000)],
        ["s3", money(10_000_000, 10_000_000)],
      ]),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].students).toBe(3);
    expect(rows[0].expected).toBe(30_000_000);
    expect(rows[0].contracted).toBe(30_000_000);
    expect(rows[0].paid).toBe(14_000_000);
    expect(rows[0].debt).toBe(16_000_000);
    expect(rows[0].gapToExpected).toBe(0);
  });

  it("belgilanmagan summa 0 — kutilayotgan ham 0", () => {
    const rows = facultyBreakdown({
      faculties: [KI],
      rates: {},
      studentsByFaculty: { ki: ["s1"] },
      moneyByStudent: new Map([["s1", money(5_000_000, 1_000_000)]]),
    });
    expect(rows[0].rate).toBe(0);
    expect(rows[0].expected).toBe(0);
    expect(rows[0].gapToExpected).toBe(5_000_000);
  });

  it("shartnomasiz talabalar kutilayotgan summani oshiradi", () => {
    const rows = facultyBreakdown({
      faculties: [KI],
      rates: { ki: 5_000_000 },
      studentsByFaculty: { ki: ["s1", "s2"] },
      moneyByStudent: new Map([["s1", money(5_000_000, 0)]]),
    });
    expect(rows[0].students).toBe(2);
    expect(rows[0].expected).toBe(10_000_000);
    expect(rows[0].contracted).toBe(5_000_000);
    expect(rows[0].gapToExpected).toBe(-5_000_000);
  });

  it("shartnomasiz talaba hisobga olmaydi", () => {
    const rows = facultyBreakdown({
      faculties: [KI],
      rates: { ki: 1_000 },
      studentsByFaculty: { ki: ["s1", "yo'q"] },
      moneyByStudent: new Map([["s1", money(1_000, 0)]]),
    });
    expect(rows[0].contracted).toBe(1_000);
    expect(rows[0].paid).toBe(0);
  });

  it("ortiqcha to'lov manfiy qarz beradi", () => {
    const rows = facultyBreakdown({
      faculties: [KI],
      rates: { ki: 1_000_000 },
      studentsByFaculty: { ki: ["s1"] },
      moneyByStudent: new Map([["s1", money(1_000_000, 1_500_000)]]),
    });
    expect(rows[0].debt).toBe(-500_000);
  });

  it("talabasi yo'q fakultet nol bilan chiqadi", () => {
    const rows = facultyBreakdown({
      faculties: [FF],
      rates: { ff: 7_000_000 },
      studentsByFaculty: {},
      moneyByStudent: new Map(),
    });
    expect(rows[0].students).toBe(0);
    expect(rows[0].expected).toBe(0);
    expect(rows[0].contracted).toBe(0);
    expect(rows[0].debt).toBe(0);
  });

  it("fakultetga talaba biriktirilmagan bo'lsa nol", () => {
    const rows = facultyBreakdown({
      faculties: [KI],
      rates: { ki: 5_000_000 },
      studentsByFaculty: {},
      moneyByStudent: new Map([["s1", money(5_000_000, 0)]]),
    });
    expect(rows[0].students).toBe(0);
    expect(rows[0].contracted).toBe(0);
  });

  it("katta shartnomalar birinchi bo'lib saralanadi", () => {
    const rows = facultyBreakdown({
      faculties: [KI, FF],
      rates: {},
      studentsByFaculty: { ki: ["s1"], ff: ["s2"] },
      moneyByStudent: new Map([
        ["s1", money(1_000, 0)],
        ["s2", money(9_000, 0)],
      ]),
    });
    expect(rows.map((r) => r.name)).toEqual([FF.name, KI.name]);
  });

  describe("breakdownTotals", () => {
    it("barcha fakultetlarni jamlaydi", () => {
      const rows = facultyBreakdown({
        faculties: [KI, FF],
        rates: { ki: 1_000_000, ff: 2_000_000 },
        studentsByFaculty: { ki: ["s1", "s2"], ff: ["s3"] },
        moneyByStudent: new Map([
          ["s1", money(1_000_000, 500_000)],
          ["s2", money(1_000_000, 0)],
          ["s3", money(2_000_000, 2_000_000)],
        ]),
      });
      const totals = breakdownTotals(rows);
      expect(totals).toEqual({
        students: 3,
        expected: 4_000_000,
        contracted: 4_000_000,
        paid: 2_500_000,
        debt: 1_500_000,
      });
    });

    it("bo'sh ro'yxatda nol", () => {
      expect(breakdownTotals([])).toEqual({
        students: 0,
        expected: 0,
        contracted: 0,
        paid: 0,
        debt: 0,
      });
    });
  });
});