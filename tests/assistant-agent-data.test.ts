import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "@prisma/client";
import {
  attendanceRowsByStudent,
  clampDay,
  clampInt,
  gradeRowsByStudent,
  percentOf,
  uzbekWeekday,
  weekdayLabel,
} from "@/server/assistant/data";

describe("assistant agent data helpers", () => {
  it("weekdayLabel o'zbekcha kunlarni va aylanmani qaytaradi", () => {
    expect(weekdayLabel(1)).toBe("dushanba");
    expect(weekdayLabel(7)).toBe("yakshanba");
    expect(weekdayLabel(8)).toBe("dushanba");
    expect(weekdayLabel(0)).toBe("yakshanba");
  });

  it("uzbekWeekday JS yakshanbasini 7 qiladi", () => {
    expect(uzbekWeekday(0)).toBe(7);
    expect(uzbekWeekday(1)).toBe(1);
    expect(uzbekWeekday(6)).toBe(6);
  });

  it("clampInt noto'g'ri qiymatlarni xavfsiz chegaralaydi", () => {
    expect(clampInt(undefined, 30, 1, 365)).toBe(30);
    expect(clampInt(500, 30, 1, 365)).toBe(365);
    expect(clampInt(-5, 30, 1, 365)).toBe(1);
    expect(clampInt(3.6, 30, 1, 365)).toBe(4);
    expect(clampInt("10", 30, 1, 365)).toBe(30);
  });

  it("clampDay faqat 1-7 orasini qabul qiladi", () => {
    expect(clampDay(3)).toBe(3);
    expect(clampDay(0)).toBeNull();
    expect(clampDay(8)).toBeNull();
    expect(clampDay("3")).toBeNull();
    expect(clampDay(undefined)).toBeNull();
  });

  it("attendanceRowsByStudent eng past foizni birinchi qo'yadi", () => {
    const students = [
      { id: "a", name: "Ali Valiyev" },
      { id: "b", name: "Bek Qodirov" },
      { id: "c", name: "Chori Karimov" },
    ];
    const records: { studentId: string; status: AttendanceStatus }[] = [
      { studentId: "a", status: "PRESENT" },
      { studentId: "a", status: "PRESENT" },
      { studentId: "a", status: "LATE" },
      { studentId: "b", status: "ABSENT" },
      { studentId: "b", status: "PRESENT" },
    ];
    const rows = attendanceRowsByStudent(students, records);
    expect(rows.map((row) => row.id)).toEqual(["c", "b", "a"]);
    expect(rows[0].total).toBe(0);
    expect(rows[0].percent).toBe(0);
    expect(rows[1].percent).toBe(50);
    expect(rows[1].eligible).toBe(false);
    expect(rows[2].percent).toBe(100);
    expect(rows[2].eligible).toBe(true);
    expect(rows[2].present).toBe(2);
    expect(rows[2].late).toBe(1);
  });

  it("attendanceRowsByStudent SUSPICIOUS va EXCUSED ni qatnashgan hisoblamaydi", () => {
    const students = [{ id: "a", name: "Ali" }];
    const rows = attendanceRowsByStudent(students, [
      { studentId: "a", status: "SUSPICIOUS" },
      { studentId: "a", status: "EXCUSED" },
      { studentId: "a", status: "PRESENT" },
      { studentId: "a", status: "PRESENT" },
    ]);
    expect(rows[0].percent).toBe(50);
    expect(rows[0].suspicious).toBe(1);
    expect(rows[0].excused).toBe(1);
  });

  it("gradeRowsByStudent o'rtacha foizni hisoblaydi, ma'lumotsizlar oxirida", () => {
    const students = [
      { id: "a", name: "Ali" },
      { id: "b", name: "Bek" },
      { id: "c", name: "Chori" },
      { id: "d", name: "Dilnoza" },
    ];
    const rows = gradeRowsByStudent(students, [
      { studentId: "a", percent: 80 },
      { studentId: "a", percent: 90 },
      { studentId: "b", percent: 60 },
      { studentId: "d", percent: 40 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["d", "b", "a", "c"]);
    expect(rows[0].percent).toBe(40);
    expect(rows[0].low).toBe(true);
    expect(rows[1].percent).toBe(60);
    expect(rows[1].low).toBe(false);
    expect(rows[2].percent).toBe(85);
    expect(rows[2].count).toBe(2);
    expect(rows[3].percent).toBe(-1);
    expect(rows[3].count).toBe(0);
    expect(rows[3].low).toBe(false);
  });

  it("percentOf chegaralarga rioya qiladi va butun songa yumaloqlaydi", () => {
    expect(percentOf(17, 20)).toBe(85);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(-3, 10)).toBe(0);
    expect(percentOf(15, 10)).toBe(100);
  });
});
