import { describe, expect, it } from "vitest";
import { canApprove, canScanAccess, canViewAccessLogs, canViewAnalysis, canViewMonitoring, isLeadership, isTyutor } from "@/modules/roles/access";

describe("rol vakolatlari: monitoring", () => {
  it("rahbariyat va o'quv bo'limi monitoringni ko'radi", () => {
    for (const role of ["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR"]) {
      expect(canViewMonitoring(role), role).toBe(true);
    }
  });

  it("o'qituvchi, tyutor, xodim va talaba monitoringni ko'rmaydi", () => {
    for (const role of ["TEACHER", "TYUTOR", "STUDENT", "XODIM"]) {
      expect(canViewMonitoring(role), role).toBe(false);
    }
  });
});

describe("rol vakolatlari: tahlil (hisobot/yuklama)", () => {
  it("o'qituvchi va rahbariyat tahlilni ko'radi", () => {
    for (const role of ["ADMIN", "TEACHER", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI"]) {
      expect(canViewAnalysis(role), role).toBe(true);
    }
  });

  it("tyutor, registrator, xodim va talaba tahlilni ko'rmaydi", () => {
    for (const role of ["TYUTOR", "REGISTRAR", "XODIM", "STUDENT"]) {
      expect(canViewAnalysis(role), role).toBe(false);
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
  it("rektor, prorektor, dekan va kafedra mudiri — rahbariyat", () => {
    expect(isLeadership("REKTOR")).toBe(true);
    expect(isLeadership("PRO_RECTOR")).toBe(true);
    expect(isLeadership("DEKAN")).toBe(true);
    expect(isLeadership("KAFEDRA_MUDIRI")).toBe(true);
    expect(isLeadership("REGISTRAR")).toBe(false);
    expect(isLeadership("XODIM")).toBe(false);
  });
});

describe("tyutor", () => {
  it("faqat TYUTOR roli uchun true", () => {
    expect(isTyutor("TYUTOR")).toBe(true);
    expect(isTyutor("TEACHER")).toBe(false);
  });
});

describe("rol vakolatlari: turniket", () => {
  it("skanerlash faqat admin/registrator/xodim", () => {
    expect(canScanAccess("ADMIN")).toBe(true);
    expect(canScanAccess("REGISTRAR")).toBe(true);
    expect(canScanAccess("XODIM")).toBe(true);
    expect(canScanAccess("STUDENT")).toBe(false);
    expect(canScanAccess("TEACHER")).toBe(false);
    expect(canScanAccess("REKTOR")).toBe(false);
  });

  it("jurnalni rahbariyat ham ko'radi, boshqalar yo'q", () => {
    expect(canViewAccessLogs("REKTOR")).toBe(true);
    expect(canViewAccessLogs("PRO_RECTOR")).toBe(true);
    expect(canViewAccessLogs("DEKAN")).toBe(false);
    expect(canViewAccessLogs("STUDENT")).toBe(false);
  });
});
