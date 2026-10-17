import { describe, expect, it } from "vitest";
import {
  ALL_CAPABILITIES,
  capabilitiesFor,
  hasAllCapabilities,
  hasAnyCapability,
  hasCapability,
  hasCourseCapability,
  normalizeRole,
} from "@/modules/capabilities";

describe("capability: monitoring", () => {
  it("rahbariyat va o'quv bo'limi ko'radi", () => {
    for (const role of ["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR"]) {
      expect(hasCapability(role, "monitoring.view"), role).toBe(true);
    }
  });

  it("o'qituvchi, tyutor, xodim va talaba ko'rmaydi", () => {
    for (const role of ["TEACHER", "TYUTOR", "STUDENT", "XODIM", "BUXGALTER", "OTA_ONA"]) {
      expect(hasCapability(role, "monitoring.view"), role).toBe(false);
    }
  });
});

describe("capability: tahlil", () => {
  it("o'qituvchi va rahbariyat ko'radi", () => {
    for (const role of ["ADMIN", "TEACHER", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI"]) {
      expect(hasCapability(role, "analysis.view"), role).toBe(true);
    }
  });

  it("boshqalar ko'rmaydi", () => {
    for (const role of ["TYUTOR", "REGISTRAR", "XODIM", "STUDENT", "BUXGALTER", "OTA_ONA"]) {
      expect(hasCapability(role, "analysis.view"), role).toBe(false);
    }
  });
});

describe("capability: tasdiqlash", () => {
  it("faqat admin va registrator", () => {
    expect(hasCapability("ADMIN", "approvals.decide")).toBe(true);
    expect(hasCapability("REGISTRAR", "approvals.decide")).toBe(true);
    expect(hasCapability("REKTOR", "approvals.decide")).toBe(false);
    expect(hasCapability("DEKAN", "approvals.decide")).toBe(false);
  });
});

describe("capability: turniket", () => {
  it("skanerlash faqat admin/registrator/xodim", () => {
    expect(hasCapability("ADMIN", "access.scan")).toBe(true);
    expect(hasCapability("REGISTRAR", "access.scan")).toBe(true);
    expect(hasCapability("XODIM", "access.scan")).toBe(true);
    expect(hasCapability("STUDENT", "access.scan")).toBe(false);
    expect(hasCapability("TEACHER", "access.scan")).toBe(false);
    expect(hasCapability("REKTOR", "access.scan")).toBe(false);
  });

  it("jurnalni rahbariyat va buxgalter ham ko'radi", () => {
    for (const role of ["ADMIN", "REGISTRAR", "XODIM", "REKTOR", "PRO_RECTOR", "BUXGALTER"]) {
      expect(hasCapability(role, "access.viewLogs"), role).toBe(true);
    }
    expect(hasCapability("DEKAN", "access.viewLogs")).toBe(false);
    expect(hasCapability("STUDENT", "access.viewLogs")).toBe(false);
  });
});

describe("capability: o'quv bo'limi (G3 yopilishi)", () => {
  it("registrator talaba/guruh/jadvalni boshqaradi", () => {
    expect(hasCapability("REGISTRAR", "academic.manage")).toBe(true);
    expect(hasCapability("DEKAN", "academic.manage")).toBe(false);
    expect(hasCapability("TEACHER", "academic.manage")).toBe(false);
  });
});

describe("capability: kurs konteksti", () => {
  it("o'qituvchi kurs ichida baholaydi va test boshqaradi", () => {
    expect(hasCourseCapability("teacher", "course.grade")).toBe(true);
    expect(hasCourseCapability("teacher", "quiz.manage")).toBe(true);
    expect(hasCourseCapability("teacher", "attendance.open")).toBe(true);
    expect(hasCourseCapability("teacher", "exam.proctor")).toBe(true);
  });

  it("talaba kurs ichida boshqaruv huquqlariga ega emas", () => {
    expect(hasCourseCapability("student", "course.grade")).toBe(false);
    expect(hasCourseCapability("student", "course.manage")).toBe(false);
    expect(hasCourseCapability("student", "quiz.manage")).toBe(false);
  });
});

describe("capability: yangi migratsiya qatlamlari", () => {
  it("baho o'zgarish so'rovlarini admin/registrator/rektor ko'radi", () => {
    for (const role of ["ADMIN", "REGISTRAR", "REKTOR"]) {
      expect(hasCapability(role, "gradeChanges.review"), role).toBe(true);
    }
    for (const role of ["DEKAN", "TEACHER", "TYUTOR", "STUDENT"]) {
      expect(hasCapability(role, "gradeChanges.review"), role).toBe(false);
    }
  });

  it("topshiriqlarni boshqaruvchilar doirasi aniq", () => {
    for (const role of ["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR", "TYUTOR"]) {
      expect(hasCapability(role, "tasks.manage"), role).toBe(true);
    }
    for (const role of ["TEACHER", "STUDENT", "BUXGALTER", "XODIM", "OTA_ONA"]) {
      expect(hasCapability(role, "tasks.manage"), role).toBe(false);
    }
  });
});

describe("capability: 2-to'lqim (hujjatlar, moliya, testlar)", () => {
  it("moliya yozuvlarini ko'rish doirasi", () => {
    for (const role of ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR", "BUXGALTER"]) {
      expect(hasCapability(role, "finance.view"), role).toBe(true);
    }
    for (const role of ["TEACHER", "DEKAN", "TYUTOR", "XODIM"]) {
      expect(hasCapability(role, "finance.view"), role).toBe(false);
    }
  });

  it("sertifikat chiqarish faqat admin va o'qituvchi", () => {
    expect(hasCapability("ADMIN", "certificates.issue")).toBe(true);
    expect(hasCapability("TEACHER", "certificates.issue")).toBe(true);
    expect(hasCapability("DEKAN", "certificates.issue")).toBe(false);
    expect(hasCapability("REGISTRAR", "certificates.issue")).toBe(false);
  });

  it("diplomlarni ko'rish doirasi", () => {
    for (const role of ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"]) {
      expect(hasCapability(role, "diplomas.view"), role).toBe(true);
    }
    expect(hasCapability("TEACHER", "diplomas.view")).toBe(false);
    expect(hasCapability("TYUTOR", "diplomas.view")).toBe(false);
  });

  it("hujjatlarni ko'rish doirasi", () => {
    for (const role of ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"]) {
      expect(hasCapability(role, "documents.view"), role).toBe(true);
    }
    expect(hasCapability("TEACHER", "documents.view")).toBe(false);
    expect(hasCapability("TYUTOR", "documents.view")).toBe(false);
  });

  it("dars jadvalini admin, registrator va o'qituvchi boshqaradi", () => {
    for (const role of ["ADMIN", "REGISTRAR", "TEACHER"]) {
      expect(hasCapability(role, "schedule.manage"), role).toBe(true);
    }
    for (const role of ["DEKAN", "TYUTOR", "STUDENT", "XODIM"]) {
      expect(hasCapability(role, "schedule.manage"), role).toBe(false);
    }
  });

  it("imtihonlarni faqat admin va o'qituvchi boshqaradi", () => {
    expect(hasCapability("ADMIN", "exams.manage")).toBe(true);
    expect(hasCapability("TEACHER", "exams.manage")).toBe(true);
    expect(hasCapability("REGISTRAR", "exams.manage")).toBe(false);
    expect(hasCapability("DEKAN", "exams.manage")).toBe(false);
  });

  it("transkriptlarni ko'rish doirasi", () => {
    for (const role of ["ADMIN", "TEACHER", "DEKAN", "KAFEDRA_MUDIRI"]) {
      expect(hasCapability(role, "transcript.view"), role).toBe(true);
    }
    for (const role of ["REGISTRAR", "TYUTOR", "STUDENT", "XODIM"]) {
      expect(hasCapability(role, "transcript.view"), role).toBe(false);
    }
  });
});

describe("capability: audit jurnali", () => {
  it("to'liq audit faqat owner'da", () => {
    expect(hasCapability("OWNER", "audit.viewAll")).toBe(true);
    expect(hasCapability("ADMIN", "audit.viewAll")).toBe(false);
  });

  it("admin scoped auditni ham ko'rmaydi", () => {
    expect(hasCapability("ADMIN", "audit.viewScoped")).toBe(false);
  });

  it("rahbariyat faqat scope bilan ko'radi", () => {
    for (const role of ["REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI"]) {
      expect(hasCapability(role, "audit.viewScoped"), role).toBe(true);
      expect(hasCapability(role, "audit.viewAll"), role).toBe(false);
    }
    expect(hasCapability("TYUTOR", "audit.viewScoped")).toBe(false);
  });
});

describe("capability: umumiy qoidalar", () => {
  it("admin audit'dan tashqari hamma capability'ga ega", () => {
    const adminCapabilities = ALL_CAPABILITIES.filter(
      (capability) => capability !== "audit.viewAll" && capability !== "audit.viewScoped",
    );
    expect(hasAllCapabilities("ADMIN", adminCapabilities)).toBe(true);
    expect(hasAllCapabilities("ADMIN", ["audit.viewAll"])).toBe(false);
  });

  it("owner hamma capability'ga ega", () => {
    expect(hasAllCapabilities("OWNER", ALL_CAPABILITIES)).toBe(true);
    expect(capabilitiesFor("OWNER")).toEqual(ALL_CAPABILITIES);
  });

  it("talabada global huquq yo'q", () => {
    expect(capabilitiesFor("STUDENT")).toHaveLength(0);
  });

  it("ota-ona farzandini ko'radi, boshqa hech narsani", () => {
    expect(hasCapability("OTA_ONA", "parent.viewChild")).toBe(true);
    expect(capabilitiesFor("OTA_ONA")).toHaveLength(1);
  });

  it("noma'lum rol hech narsa olmaydi", () => {
    expect(normalizeRole("HACKER")).toBeNull();
    expect(hasCapability("HACKER", "monitoring.view")).toBe(false);
    expect(capabilitiesFor("")).toHaveLength(0);
  });

  it("hasAnyCapability kamida bittasini tekshiradi", () => {
    expect(hasAnyCapability("BUXGALTER", ["finance.manage", "monitoring.view"])).toBe(true);
    expect(hasAnyCapability("BUXGALTER", ["monitoring.view", "staff.manage"])).toBe(false);
  });
});
