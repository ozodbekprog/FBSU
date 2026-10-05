import { describe, expect, it } from "vitest";
import { atRiskStudents, attendancePercent, studentAttendance } from "@/modules/monitoring/attendance-kpi";

describe("attendancePercent", () => {
  it("PRESENT va LATE qatnashgan hisoblanadi, EXCUSED/SUSPICIOUS/ABSENT yo'q", () => {
    expect(attendancePercent(["PRESENT", "LATE", "ABSENT", "EXCUSED", "SUSPICIOUS"])).toBe(40);
  });

  it("bo'sh ro'yxat 0 qaytaradi", () => {
    expect(attendancePercent([])).toBe(0);
  });
});

describe("studentAttendance", () => {
  it("talabalarni guruhlab foiz chiqaradi", () => {
    const rows = [
      { studentId: "a", status: "PRESENT" },
      { studentId: "b", status: "ABSENT" },
      { studentId: "a", status: "LATE" },
      { studentId: "a", status: "ABSENT" },
    ];
    const result = studentAttendance(rows);
    const a = result.find((row) => row.studentId === "a");
    expect(a).toEqual({ studentId: "a", total: 3, attended: 2, percent: 67 });
  });
});

describe("atRiskStudents", () => {
  it("faqat 80% dan pastlarni qaytaradi va kamida 3 yozuv talab qiladi", () => {
    const rows = [
      { studentId: "low", status: "PRESENT" },
      { studentId: "low", status: "ABSENT" },
      { studentId: "low", status: "ABSENT" },
      { studentId: "few", status: "ABSENT" },
      { studentId: "ok", status: "PRESENT" },
      { studentId: "ok", status: "PRESENT" },
      { studentId: "ok", status: "LATE" },
      { studentId: "ok", status: "PRESENT" },
    ];
    const risk = atRiskStudents(rows);
    expect(risk.map((row) => row.studentId)).toEqual(["low"]);
  });
});
