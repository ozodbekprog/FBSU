import { describe, expect, it } from "vitest";

// attendance-points POST tanasidagi groupId normallashtirish.
// API ichidagi xatti-harakatni aks ettiruvchi sof funksiya —
// DB ulanishisiz tekshiriladi.
function normalizeGroupId(groupId: unknown): string | null {
  return groupId == null || groupId === "" ? null : String(groupId);
}

// points maydonini tekshirish (0.1..15).
function isValidPoints(points: unknown): points is number {
  return typeof points === "number" && Number.isFinite(points) && points >= 0.1 && points <= 15;
}

describe("attendance-points groupId normallashtirish", () => {
  it("undefined → null (sinfsiz yozuv)", () => {
    expect(normalizeGroupId(undefined)).toBeNull();
  });

  it("null → null", () => {
    expect(normalizeGroupId(null)).toBeNull();
  });

  it("bo'sh satr → null (undefined bo'lgani bilan bir xil)", () => {
    expect(normalizeGroupId("")).toBeNull();
  });

  it("haqiqiy groupId o'zgartirilmaydi", () => {
    expect(normalizeGroupId("grp1")).toBe("grp1");
  });

  it("cuid ko'rinishidagi id saqlanadi", () => {
    const cuid = "cm5h1k2l30000abcd1234efgh";
    expect(normalizeGroupId(cuid)).toBe(cuid);
  });
});

describe("attendance-points points validatsiyasi", () => {
  it("0.1 va 15 oralig'idagi qiymatlar to'g'ri", () => {
    expect(isValidPoints(0.1)).toBe(true);
    expect(isValidPoints(1)).toBe(true);
    expect(isValidPoints(7.5)).toBe(true);
    expect(isValidPoints(15)).toBe(true);
  });

  it("0 va 15 dan katta qiymatlar rad etiladi", () => {
    expect(isValidPoints(0)).toBe(false);
    expect(isValidPoints(0.05)).toBe(false);
    expect(isValidPoints(15.1)).toBe(false);
    expect(isValidPoints(20)).toBe(false);
  });

  it("raqam bo'lmagan qiymatlar rad etiladi", () => {
    expect(isValidPoints(undefined)).toBe(false);
    expect(isValidPoints(null)).toBe(false);
    expect(isValidPoints("5")).toBe(false);
    expect(isValidPoints(NaN)).toBe(false);
    expect(isValidPoints(Infinity)).toBe(false);
  });
});

describe("davamat draft kaliti", () => {
  // Kurs almashganda draft qiymatlar group.id bilan saqlanadi,
  // sinfsiz qiymat esa maxsus "__all__" kalitida — ustma-ush tushmasligi uchun.
  const buildDrafts = (
    groups: { id: string }[],
    configs: { groupId: string | null; points: number }[],
  ) => {
    const drafts: Record<string, number> = {};
    for (const g of groups) {
      drafts[g.id] = configs.find((c) => c.groupId === g.id)?.points ?? 1;
    }
    drafts.__all__ = configs.find((c) => c.groupId === null)?.points ?? 1;
    return drafts;
  };

  it("sinf drafti saqdlangan qiymatdan olinadi", () => {
    const drafts = buildDrafts([{ id: "a" }, { id: "b" }], [
      { groupId: "a", points: 2.5 },
      { groupId: "b", points: 0.5 },
    ]);
    expect(drafts.a).toBe(2.5);
    expect(drafts.b).toBe(0.5);
  });

  it("configda yo'q sinf uchun standart 1", () => {
    const drafts = buildDrafts([{ id: "a" }, { id: "b" }], [
      { groupId: "a", points: 2.5 },
    ]);
    expect(drafts.a).toBe(2.5);
    expect(drafts.b).toBe(1);
  });

  it("sinfsiz qiymat __all__ kalitida", () => {
    const drafts = buildDrafts([{ id: "a" }], [{ groupId: null, points: 3 }]);
    expect(drafts.__all__).toBe(3);
  });

  it("hech narsa yo'q bo'lsa hammasi 1", () => {
    const drafts = buildDrafts([{ id: "a" }], []);
    expect(drafts).toEqual({ a: 1, __all__: 1 });
  });
});