import { describe, expect, it } from "vitest";
import {
  attendancePercent,
  averagePercent,
  cleanAiText,
  fallbackSecurityText,
  fallbackStudentText,
  firstName,
  formatDateUz,
  parseSecurityAnswer,
  scorePercent,
  securityEventCount,
  securityPrompt,
  shouldSendDeanReport,
  shouldSendStudentAlert,
  shouldSendTeacherReport,
  studentPrompt,
  studentSeverity,
} from "../bot/ai-core.mjs";

function emptyEvents() {
  return {
    blockedLogins: [],
    newDevices: [],
    deviceChallenges: [],
    audits: [],
    suspiciousAttendance: [],
    examEvents: [],
  };
}

describe("attendancePercent", () => {
  it("faqat PRESENT va LATE ni hisoblaydi", () => {
    expect(attendancePercent(["PRESENT", "LATE", "ABSENT", "EXCUSED", "SUSPICIOUS"])).toEqual({
      total: 5,
      attended: 2,
      percent: 40,
    });
  });

  it("bo'sh ro'yxatda 0 qaytaradi", () => {
    expect(attendancePercent([])).toEqual({ total: 0, attended: 0, percent: 0 });
  });
});

describe("scorePercent", () => {
  it("foizni yaxlitlaydi va 100 dan oshirmaydi", () => {
    expect(scorePercent(8, 10)).toBe(80);
    expect(scorePercent(15, 10)).toBe(100);
    expect(scorePercent(-2, 10)).toBe(0);
  });

  it("noto'g'ri qiymatlarda null qaytaradi", () => {
    expect(scorePercent(null, 10)).toBeNull();
    expect(scorePercent(5, 0)).toBeNull();
    expect(scorePercent(5, Number.NaN)).toBeNull();
  });
});

describe("averagePercent", () => {
  it("o'rtachani yaxlitlaydi", () => {
    expect(averagePercent([80, 90, 70])).toBe(80);
    expect(averagePercent([81, 82])).toBe(82);
  });

  it("bo'sh yoki noto'g'ri qiymatlarda -1 qaytaradi", () => {
    expect(averagePercent([])).toBe(-1);
    expect(averagePercent([Number.NaN])).toBe(-1);
  });
});

describe("cleanAiText", () => {
  it("markdown belgilarini olib tashlaydi va bo'shliqni tozalaydi", () => {
    expect(cleanAiText("**Muhim**  _eslatma_  \n\n\n`kod`")).toBe("Muhim eslatma\n\nkod");
  });

  it("uzun matnni ellipsis bilan qisqartiradi", () => {
    const result = cleanAiText("a".repeat(200), 50);
    expect(result.length).toBe(50);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("student alerts", () => {
  const user = { name: "Ali Valiyev" };
  const facts = {
    groupName: "KI-21",
    attendance: [{ course: "Matematika", total: 10, attended: 6, percent: 60 }],
    grades: [{ course: "Fizika", percent: 45 }],
    deadlines: [],
    exams: [],
    risks: [
      { code: "attendance", severity: "high", label: "Matematika davomati 60% (80% kerak)" },
      { code: "grade", severity: "medium", label: "Fizika bahosi 45%" },
    ],
  };

  it("xavf bo'lsa ogohlantirish yuboriladi", () => {
    expect(shouldSendStudentAlert(facts)).toBe(true);
    expect(studentSeverity(facts)).toBe("high");
    expect(shouldSendStudentAlert({ ...facts, risks: [] })).toBe(false);
    expect(studentSeverity({ ...facts, risks: [] })).toBe("none");
  });

  it("fallback matni ism va xavflarni o'z ichiga oladi", () => {
    const text = fallbackStudentText(user, facts);
    expect(text).toContain("Ali");
    expect(text).toContain("Matematika davomati 60%");
    expect(text).toContain("Fizika bahosi 45%");
  });

  it("prompt faqat berilgan faktlarni sanaydi", () => {
    const prompt = studentPrompt(user, facts, new Date(2026, 10, 4));
    expect(prompt).toContain("guruh KI-21");
    expect(prompt).toContain("Davomat: Matematika 60%");
    expect(prompt).toContain("Baholar: Fizika 45%");
    expect(prompt).toContain("Yaqin muddatlar: yo'q");
    expect(prompt).not.toContain("undefined");
  });
});

describe("teacher va dekan hisobotlari", () => {
  it("talaba yoki xavf bo'lmasa hisobot yuborilmaydi", () => {
    expect(shouldSendTeacherReport(null)).toBe(false);
    expect(shouldSendTeacherReport({ studentCount: 0, atRisk: [], deadlines: [], exams: [] })).toBe(
      false,
    );
    expect(shouldSendDeanReport({ studentCount: 0, atRiskCount: 0, deadlines: [], exams: [] })).toBe(
      false,
    );
  });

  it("xavf yoki yaqin muddat bo'lsa hisobot yuboriladi", () => {
    expect(
      shouldSendTeacherReport({ studentCount: 10, atRisk: [{}], deadlines: [], exams: [] }),
    ).toBe(true);
    expect(
      shouldSendDeanReport({ studentCount: 10, atRiskCount: 0, deadlines: [{}], exams: [] }),
    ).toBe(true);
  });
});

describe("security alerts", () => {
  it("hodisalarni jamlaydi", () => {
    expect(securityEventCount(emptyEvents())).toBe(0);
    const events = { ...emptyEvents(), blockedLogins: [{}, {}], newDevices: [{}] };
    expect(securityEventCount(events)).toBe(3);
  });

  it("faqat jiddiy hodisalarda fallback matn beradi", () => {
    expect(fallbackSecurityText(emptyEvents())).toBe("");
    expect(
      fallbackSecurityText({ ...emptyEvents(), audits: [{}], deviceChallenges: [{}] }),
    ).toBe("");
    expect(fallbackSecurityText({ ...emptyEvents(), newDevices: [{}] })).toContain(
      "Yangi qurilma: 1",
    );
    expect(
      fallbackSecurityText({ ...emptyEvents(), audits: [{ action: "USER_DELETE" }] }),
    ).toContain("Muhim audit hodisasi: 1");
  });

  it("AI SKIP javobini to'g'ri o'qiydi", () => {
    expect(parseSecurityAnswer("SKIP")).toEqual({ skip: true, text: "" });
    expect(parseSecurityAnswer("  skip — jiddiy xavf yo'q")).toEqual({ skip: true, text: "" });
    expect(parseSecurityAnswer("**Bloklangan kirishlar ko'paygan.**")).toEqual({
      skip: false,
      text: "Bloklangan kirishlar ko'paygan.",
    });
  });

  it("prompt oraliq va hodisa tafsilotlarini beradi", () => {
    const since = new Date(2026, 10, 3, 8, 0);
    const now = new Date(2026, 10, 4, 8, 0);
    const events = {
      ...emptyEvents(),
      blockedLogins: [
        {
          name: "Ali",
          email: "ali@ttpu.uz",
          deviceName: "Chrome",
          ip: "10.0.0.1",
          city: "Toshkent",
          createdAt: now,
        },
      ],
    };
    const prompt = securityPrompt(events, since, now);
    expect(prompt).toContain("03.11.2026 08:00 — 04.11.2026 08:00");
    expect(prompt).toContain("Ali (ali@ttpu.uz)");
    expect(prompt).toContain("Chrome");
  });
});

describe("yordamchi funksiyalar", () => {
  it("firstName bo'sh ismda Talaba qaytaradi", () => {
    expect(firstName("Ali Valiyev")).toBe("Ali");
    expect(firstName("")).toBe("Talaba");
    expect(firstName(null)).toBe("Talaba");
  });

  it("sana formati o'zbekcha ko'rinishda", () => {
    expect(formatDateUz(new Date(2026, 10, 4))).toBe("04.11.2026");
    expect(formatDateUz(new Date("noto'g'ri"))).toBe("");
  });
});
