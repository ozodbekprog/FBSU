import { describe, expect, it } from "vitest";
import {
  BOUNTY_POINTS_DEFAULT,
  bountyLeaders,
  bountyPoints,
  fixerStats,
  readFix,
  readReporter,
  readSeverity,
} from "@/lib/bug-bounty";

describe("readSeverity", () => {
  it("faqat low/medium/high qiymatlarni qabul qiladi", () => {
    expect(readSeverity({ ai: { severity: "high" } })).toBe("high");
    expect(readSeverity({ ai: { severity: "critical" } })).toBeNull();
    expect(readSeverity({ ai: null })).toBeNull();
    expect(readSeverity(null)).toBeNull();
  });
});

describe("bountyPoints", () => {
  it("tuzatilgan xatoga jiddiylik bo'yicha ball beradi", () => {
    expect(bountyPoints("FIXED", { ai: { severity: "high" } })).toBe(50);
    expect(bountyPoints("FIXED", { ai: { severity: "medium" } })).toBe(30);
    expect(bountyPoints("FIXED", { ai: { severity: "low" } })).toBe(20);
    expect(bountyPoints("FIXED", {})).toBe(BOUNTY_POINTS_DEFAULT);
  });

  it("tuzatilmagan xatoga ball bermaydi", () => {
    expect(bountyPoints("NEW", { ai: { severity: "high" } })).toBe(0);
    expect(bountyPoints("IN_REVIEW", { ai: { severity: "high" } })).toBe(0);
    expect(bountyPoints("REJECTED", { ai: { severity: "high" } })).toBe(0);
  });
});

describe("bountyLeaders", () => {
  it("topuvchilarni ball bo'yicha saralaydi", () => {
    const rows = bountyLeaders([
      { status: "FIXED", name: "Aziza", role: "STUDENT", meta: { ai: { severity: "high" } } },
      { status: "FIXED", name: "Aziza", role: "STUDENT", meta: { ai: { severity: "low" } } },
      { status: "REJECTED", name: "Aziza", role: "STUDENT", meta: null },
      { status: "FIXED", name: "Bekzod", role: null, meta: {} },
      { status: "NEW", name: null, role: null, meta: null },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "Aziza", role: "STUDENT", points: 70, fixed: 2, total: 3 });
    expect(rows[1]).toEqual({ name: "Bekzod", role: null, points: 25, fixed: 1, total: 1 });
  });
});

describe("fixerStats", () => {
  it("deploy qilingan worker'larni sanaydi", () => {
    const stats = fixerStats([
      { meta: { fix: { status: "deployed", worker: "ryzen-ai7" } } },
      { meta: { fix: { status: "deployed", worker: "ryzen-ai7" } } },
      { meta: { fix: { status: "deployed", worker: "Prototype" } } },
      { meta: { fix: { status: "failed", worker: "Prototype" } } },
      { meta: null },
    ]);
    expect(stats).toEqual([
      { node: "ryzen-ai7", count: 2 },
      { node: "Prototype", count: 1 },
    ]);
  });
});

describe("readFix", () => {
  it("fix holatini o'qiydi", () => {
    expect(
      readFix({ fix: { status: "deployed", worker: "gtx1650-pc", deployedAt: "2026-10-02 10:03:47" } }),
    ).toEqual({ status: "deployed", worker: "gtx1650-pc", deployedAt: "2026-10-02 10:03:47" });
    expect(readFix({})).toEqual({ status: null, worker: null, deployedAt: null });
  });
});

describe("readReporter", () => {
  it("meta dan foydalanuvchi nomini oladi", () => {
    expect(readReporter({ userName: "Ozodbek", userRole: "STUDENT" })).toEqual({
      name: "Ozodbek",
      role: "STUDENT",
    });
    expect(readReporter(null)).toEqual({ name: null, role: null });
  });
});
