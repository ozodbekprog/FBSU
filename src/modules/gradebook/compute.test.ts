import { describe, expect, it } from "vitest";
import { computeFinalGrades, type GradebookCategory, type GradebookItem, type GradebookScore } from "./compute";

const catA: GradebookCategory = { id: "cat-a", name: "Nazorat", weight: 30 };
const catB: GradebookCategory = { id: "cat-b", name: "Amaliy", weight: 70 };

describe("computeFinalGrades", () => {
  it("kategoriya ichida item vaznlari bo'yicha vaznli o'rtacha hisoblaydi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: "cat-a", name: "Test 1", weight: 2, maxScore: 100 },
      { id: "i2", categoryId: "cat-a", name: "Test 2", weight: 1, maxScore: 100 },
    ];
    const scores: GradebookScore[] = [
      { itemId: "i1", studentId: "s1", score: 80 },
      { itemId: "i2", studentId: "s1", score: 50 },
    ];
    const [result] = computeFinalGrades([catA], items, ["s1"], scores);
    expect(result.categoryPercents["cat-a"]).toBeCloseTo((80 * 2 + 50 * 1) / 3);
    expect(result.percent).toBeCloseTo(70);
  });

  it("item vaznlari hammasi 0 bo'lsa teng o'rtacha oladi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: null, name: "A", weight: 0, maxScore: 100 },
      { id: "i2", categoryId: null, name: "B", weight: 0, maxScore: 50 },
    ];
    const scores: GradebookScore[] = [
      { itemId: "i1", studentId: "s1", score: 60 },
      { itemId: "i2", studentId: "s1", score: 50 },
    ];
    const [result] = computeFinalGrades([], items, ["s1"], scores);
    expect(result.percent).toBeCloseTo((60 + 100) / 2);
  });

  it("yakuniy baho kategoriya vaznlari bo'yicha hisoblanadi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: "cat-a", name: "A", weight: 1, maxScore: 100 },
      { id: "i2", categoryId: "cat-b", name: "B", weight: 1, maxScore: 100 },
    ];
    const scores: GradebookScore[] = [
      { itemId: "i1", studentId: "s1", score: 40 },
      { itemId: "i2", studentId: "s1", score: 90 },
    ];
    const [result] = computeFinalGrades([catA, catB], items, ["s1"], scores);
    expect(result.percent).toBeCloseTo((40 * 30 + 90 * 70) / 100);
  });

  it("bahosiz itemlar hisobga olinmaydi, kategoriyada baho yo'q bo'lsa null", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: "cat-a", name: "A", weight: 1, maxScore: 100 },
      { id: "i2", categoryId: "cat-b", name: "B", weight: 1, maxScore: 100 },
    ];
    const scores: GradebookScore[] = [{ itemId: "i1", studentId: "s1", score: 75 }];
    const [result] = computeFinalGrades([catA, catB], items, ["s1"], scores);
    expect(result.categoryPercents["cat-a"]).toBeCloseTo(75);
    expect(result.categoryPercents["cat-b"]).toBeNull();
    expect(result.percent).toBeCloseTo(75);
  });

  it("kategoriyasiz itemlar tekis o'rtacha bo'yicha yakunlanadi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: null, name: "A", weight: 5, maxScore: 100 },
      { id: "i2", categoryId: null, name: "B", weight: 9, maxScore: 200 },
    ];
    const scores: GradebookScore[] = [
      { itemId: "i1", studentId: "s1", score: 100 },
      { itemId: "i2", studentId: "s1", score: 100 },
    ];
    const [result] = computeFinalGrades([], items, ["s1"], scores);
    expect(result.categoryPercents).toEqual({});
    expect(result.percent).toBeCloseTo((100 + 50) / 2);
  });

  it("baholar umuman bo'lmasa percent null bo'ladi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: "cat-a", name: "A", weight: 1, maxScore: 100 },
      { id: "i2", categoryId: null, name: "B", weight: 1, maxScore: 100 },
    ];
    const [result] = computeFinalGrades([catA], items, ["s1"], []);
    expect(result.percent).toBeNull();
    expect(result.categoryPercents["cat-a"]).toBeNull();
  });

  it("ball 0..100 oralig'iga clamp qilinadi va maxScore<=0 item tashlanadi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: null, name: "Ortiqcha", weight: 0, maxScore: 100 },
      { id: "i2", categoryId: null, name: "Manfiy", weight: 0, maxScore: 100 },
      { id: "i3", categoryId: null, name: "Nol max", weight: 100, maxScore: 0 },
    ];
    const scores: GradebookScore[] = [
      { itemId: "i1", studentId: "s1", score: 250 },
      { itemId: "i2", studentId: "s1", score: -30 },
      { itemId: "i3", studentId: "s1", score: 0 },
    ];
    const [result] = computeFinalGrades([], items, ["s1"], scores);
    expect(result.percent).toBeCloseTo((100 + 0) / 2);
  });

  it("bir nechta talabani alohida hisoblaydi", () => {
    const items: GradebookItem[] = [
      { id: "i1", categoryId: "cat-a", name: "A", weight: 1, maxScore: 100 },
    ];
    const scores: GradebookScore[] = [
      { itemId: "i1", studentId: "s1", score: 100 },
      { itemId: "i1", studentId: "s2", score: 0 },
    ];
    const result = computeFinalGrades([catA], items, ["s1", "s2", "s3"], scores);
    expect(result.map((entry) => entry.percent)).toEqual([100, 0, null]);
  });
});
