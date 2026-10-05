import { describe, expect, it } from "vitest";
import { canApprove, canViewMonitoring, isLeadership, isTyutor } from "@/modules/roles/access";

describe("rol vakolatlari: monitoring", () => {
  it("rahbariyat va o'quv bo'limi monitoringni ko'radi", () => {
    for (const role of ["ADMIN", "REKTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR"]) {
      expect(canViewMonitoring(role), role).toBe(true);
    }
  });

  it("o'qituvchi, tyutor va talaba monitoringni ko'rmaydi", () => {
    for (const role of ["TEACHER", "TYUTOR", "STUDENT"]) {
      expect(canViewMonitoring(role), role).toBe(false);
    }
  });
});

describe("rol vakolatlari: tasdiqlash", () => {
  it("faqat admin va registrator tasdiqlaydi", () => {
    expect(canApprove("ADMIN")).toBe(true);
    expect(canApprove("REGISTRAR")).toBe(true);
    expect(canApprove("REKTOR")).toBe(false);
    expect(canApprove("DEKAN")).toBe(false);
  });
});

describe("rol vakolatlari: rahbariyat", () => {
  it("rektor, dekan va kafedra mudiri — rahbariyat", () => {
    expect(isLeadership("REKTOR")).toBe(true);
    expect(isLeadership("DEKAN")).toBe(true);
    expect(isLeadership("KAFEDRA_MUDIRI")).toBe(true);
    expect(isLeadership("REGISTRAR")).toBe(false);
  });
});

describe("tyutor", () => {
  it("faqat TYUTOR roli uchun true", () => {
    expect(isTyutor("TYUTOR")).toBe(true);
    expect(isTyutor("TEACHER")).toBe(false);
  });
});
