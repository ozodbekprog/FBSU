import { describe, expect, it } from "vitest";
import { EXAM_CODE_ALPHABET, EXAM_CODE_LENGTH } from "./config";
import { formatExamCode, generateExamCode, isValidExamCode, normalizeExamCode } from "./code";

describe("normalizeExamCode", () => {
  it("harflarni katta harfga o'giradi va ajratgichlarni olib tashlaydi", () => {
    expect(normalizeExamCode("ab3-kd9")).toBe("AB3KD9");
    expect(normalizeExamCode(" AB 3 KD 9 ")).toBe("AB3KD9");
  });
});

describe("isValidExamCode", () => {
  it("to'g'ri kodni qabul qiladi", () => {
    expect(isValidExamCode("AB3KD9")).toBe(true);
    expect(isValidExamCode("ab3-kd9")).toBe(true);
  });

  it("chalkash harflar (I, O, 0, 1) va noto'g'ri uzunlikni rad etadi", () => {
    expect(isValidExamCode("AB0KD9")).toBe(false);
    expect(isValidExamCode("AB1KD9")).toBe(false);
    expect(isValidExamCode("ABIKD9")).toBe(false);
    expect(isValidExamCode("ABOKD9")).toBe(false);
    expect(isValidExamCode("ABC")).toBe(false);
    expect(isValidExamCode("AB3KD9X")).toBe(false);
  });
});

describe("formatExamCode", () => {
  it("3-3 ko'rinishida defis qo'shadi", () => {
    expect(formatExamCode("ab3kd9")).toBe("AB3-KD9");
    expect(formatExamCode("ABC")).toBe("ABC");
  });
});

describe("generateExamCode", () => {
  it("faqat ruxsat etilgan alifbodan foydalanadi va uzunlik to'g'ri", () => {
    for (let index = 0; index < 200; index += 1) {
      const code = generateExamCode();
      expect(code).toHaveLength(EXAM_CODE_LENGTH);
      for (const char of code) expect(EXAM_CODE_ALPHABET).toContain(char);
    }
  });

  it("berilgan tasodifiy generator bilan deterministik", () => {
    const first = generateExamCode(() => 0);
    const second = generateExamCode(() => 0);
    expect(first).toBe(second);
    expect(first).toBe(EXAM_CODE_ALPHABET[0].repeat(EXAM_CODE_LENGTH));
  });
});
