import { describe, expect, it } from "vitest";
import { needsApproval } from "@/modules/grades/regrade";

describe("needsApproval: baho o'zgartirish nazorati", () => {
  it("birinchi baholash (SUBMITTED -> GRADED) tasdiq talab qilmaydi", () => {
    expect(needsApproval("TEACHER", { status: "SUBMITTED", score: null }, 8)).toBe(false);
  });

  it("baholangan ballni o'zgartirish o'qituvchiga tasdiq talab qiladi", () => {
    expect(needsApproval("TEACHER", { status: "GRADED", score: 8 }, 9)).toBe(true);
    expect(needsApproval("TEACHER", { status: "GRADED", score: 8 }, 7)).toBe(true);
  });

  it("ball o'zgarmasa tasdiq talab qilinmaydi", () => {
    expect(needsApproval("TEACHER", { status: "GRADED", score: 8 }, 8)).toBe(false);
  });

  it("admin va registrator to'g'ridan-to'g'ri o'zgartiradi", () => {
    expect(needsApproval("ADMIN", { status: "GRADED", score: 8 }, 9)).toBe(false);
    expect(needsApproval("REGISTRAR", { status: "GRADED", score: 8 }, 9)).toBe(false);
  });

  it("talaba baho o'zgartira olmaydi (tasdiqqa ham yuborilmaydi)", () => {
    expect(needsApproval("STUDENT", { status: "GRADED", score: 8 }, 10)).toBe(false);
  });
});
