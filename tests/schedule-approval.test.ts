import { describe, expect, it } from "vitest";
import { canApproveSchedule, canManageEntry, initialApproval } from "@/app/api/schedule/_helpers";

describe("schedule approval: kim tasdiqlay oladi", () => {
  it("ADMIN va REGISTRAR tasdiqlay oladi", () => {
    expect(canApproveSchedule("ADMIN")).toBe(true);
    expect(canApproveSchedule("REGISTRAR")).toBe(true);
  });

  it("TEACHER va STUDENT tasdiqlay olmaydi", () => {
    expect(canApproveSchedule("TEACHER")).toBe(false);
    expect(canApproveSchedule("STUDENT")).toBe(false);
  });
});

describe("schedule approval: boshlang'ich holat", () => {
  it("o'qituvchi yozuvi PENDING (tasdiq kutadi)", () => {
    expect(initialApproval("TEACHER")).toBe("PENDING");
  });

  it("admin va registrator yozuvi darhol APPROVED", () => {
    expect(initialApproval("ADMIN")).toBe("APPROVED");
    expect(initialApproval("REGISTRAR")).toBe("APPROVED");
  });
});

describe("schedule approval: boshqarish huquqi", () => {
  it("registrator har qanday yozuvni boshqara oladi", () => {
    const registrar = { id: "r1", role: "REGISTRAR" as const, name: "O'quv bo'limi" };
    expect(canManageEntry(registrar, { teacherId: "t1", teacher: "Boshqa" })).toBe(true);
    expect(canManageEntry(registrar, { teacherId: null, teacher: null })).toBe(true);
  });

  it("o'qituvchi faqat o'z yozuvini boshqaradi", () => {
    const teacher = { id: "t1", role: "TEACHER" as const, name: "Ali Valiyev" };
    expect(canManageEntry(teacher, { teacherId: "t1", teacher: null })).toBe(true);
    expect(canManageEntry(teacher, { teacherId: "t2", teacher: null })).toBe(false);
    expect(canManageEntry(teacher, { teacherId: null, teacher: "Ali Valiyev" })).toBe(true);
    expect(canManageEntry(teacher, { teacherId: null, teacher: "Boshqa Odam" })).toBe(false);
  });
});
