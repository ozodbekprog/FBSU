import { describe, expect, it } from "vitest";
import {
  asAnswers,
  autoScore,
  formatAnswer,
  isAnswerCorrect,
  normalizeShortAnswer,
  parseAcceptedAnswers,
  type QuestionFull,
  type QuizAnswers,
} from "./shared";

function question(overrides: Partial<QuestionFull> = {}): QuestionFull {
  return {
    id: "q1",
    text: "Savol",
    type: "SINGLE",
    options: ["A", "B"],
    correct: [0],
    points: 2,
    position: 1,
    ...overrides,
  };
}

describe("isAnswerCorrect — TRUE_FALSE", () => {
  it("accepts the marked index 0", () => {
    const item = question({ type: "TRUE_FALSE", options: ["To'g'ri", "Noto'g'ri"], correct: [0] });
    expect(isAnswerCorrect(item, 0)).toBe(true);
  });

  it("rejects the opposite answer and non numeric input", () => {
    const item = question({ type: "TRUE_FALSE", options: ["To'g'ri", "Noto'g'ri"], correct: [0] });
    expect(isAnswerCorrect(item, 1)).toBe(false);
    expect(isAnswerCorrect(item, "0")).toBe(false);
    expect(isAnswerCorrect(item, undefined)).toBe(false);
  });
});

describe("isAnswerCorrect — SHORT_ANSWER", () => {
  const item = question({
    type: "SHORT_ANSWER",
    options: [],
    correct: ["Toshkent", "Tashkent"],
  });

  it("is case-insensitive and trims spaces", () => {
    expect(isAnswerCorrect(item, "  tashkent ")).toBe(true);
    expect(isAnswerCorrect(item, "TOSHKENT")).toBe(true);
  });

  it("rejects wrong and empty answers", () => {
    expect(isAnswerCorrect(item, "Samarqand")).toBe(false);
    expect(isAnswerCorrect(item, "   ")).toBe(false);
    expect(isAnswerCorrect(item, 0)).toBe(false);
  });

  it("normalizes and parses accepted answers", () => {
    expect(normalizeShortAnswer("  Toshkent  ")).toBe("toshkent");
    expect(parseAcceptedAnswers("Toshkent, tashkent, , Tashkent")).toEqual(["Toshkent", "tashkent"]);
  });
});

describe("isAnswerCorrect — NUMERIC", () => {
  const item = question({ type: "NUMERIC", options: [], correct: [42] });

  it("accepts numeric strings and numbers", () => {
    expect(isAnswerCorrect(item, "42")).toBe(true);
    expect(isAnswerCorrect(item, " 42 ")).toBe(true);
    expect(isAnswerCorrect(item, 42)).toBe(true);
  });

  it("rejects NaN, empty and wrong values", () => {
    expect(isAnswerCorrect(item, "abc")).toBe(false);
    expect(isAnswerCorrect(item, "")).toBe(false);
    expect(isAnswerCorrect(item, "42.5")).toBe(false);
    expect(isAnswerCorrect(item, Number.NaN)).toBe(false);
  });
});

describe("legacy question types", () => {
  it("grades SINGLE by exact index", () => {
    const item = question({ type: "SINGLE", correct: [1] });
    expect(isAnswerCorrect(item, 1)).toBe(true);
    expect(isAnswerCorrect(item, 0)).toBe(false);
  });

  it("grades MULTIPLE regardless of selection order", () => {
    const item = question({ type: "MULTIPLE", options: ["A", "B", "C"], correct: [0, 2] });
    expect(isAnswerCorrect(item, [2, 0])).toBe(true);
    expect(isAnswerCorrect(item, [0])).toBe(false);
  });

  it("never auto-grades TEXT", () => {
    const item = question({ type: "TEXT", options: [], correct: [] });
    expect(isAnswerCorrect(item, "javob")).toBe(false);
  });
});

describe("isAnswerCorrect — MATCHING", () => {
  const item = question({
    type: "MATCHING",
    options: ["O'zbekiston", "Rossiya", "Xitoy"],
    correct: ["Toshkent", "Moskva", "Pekin"],
  });

  it("accepts the complete correct pairing", () => {
    expect(isAnswerCorrect(item, ["Toshkent", "Moskva", "Pekin"])).toBe(true);
  });

  it("rejects a partially filled answer", () => {
    expect(isAnswerCorrect(item, ["Toshkent", "Moskva"])).toBe(false);
    expect(isAnswerCorrect(item, ["Toshkent", "", "Pekin"])).toBe(false);
  });

  it("rejects swapped and empty answers", () => {
    expect(isAnswerCorrect(item, ["Toshkent", "Pekin", "Moskva"])).toBe(false);
    expect(isAnswerCorrect(item, [])).toBe(false);
    expect(isAnswerCorrect(item, undefined)).toBe(false);
  });

  it("keeps case sensitivity", () => {
    expect(isAnswerCorrect(item, ["toshkent", "Moskva", "Pekin"])).toBe(false);
  });
});

describe("isAnswerCorrect — ORDERING", () => {
  const item = question({
    type: "ORDERING",
    options: ["Birinchi", "Ikkinchi", "Uchinchi"],
    correct: [],
  });

  it("accepts the exact order", () => {
    expect(isAnswerCorrect(item, ["Birinchi", "Ikkinchi", "Uchinchi"])).toBe(true);
  });

  it("rejects a swapped order", () => {
    expect(isAnswerCorrect(item, ["Ikkinchi", "Birinchi", "Uchinchi"])).toBe(false);
  });

  it("rejects partial, empty and case-changed orders", () => {
    expect(isAnswerCorrect(item, ["Birinchi", "Ikkinchi"])).toBe(false);
    expect(isAnswerCorrect(item, [])).toBe(false);
    expect(isAnswerCorrect(item, undefined)).toBe(false);
    expect(isAnswerCorrect(item, ["birinchi", "Ikkinchi", "Uchinchi"])).toBe(false);
  });
});

describe("string answer lists", () => {
  it("keeps string arrays when reading stored answers", () => {
    expect(asAnswers({ matching: ["A", "B"], ordering: ["B", "A"], single: 1 })).toEqual({
      matching: ["A", "B"],
      ordering: ["B", "A"],
      single: 1,
    });
  });

  it("formats matching pairs and ordering sequence", () => {
    const matching = question({
      type: "MATCHING",
      options: ["A", "B"],
      correct: ["1", "2"],
    });
    expect(formatAnswer(matching, ["1", "2"])).toBe("A → 1\nB → 2");
    const ordering = question({ type: "ORDERING", options: ["A", "B"], correct: [] });
    expect(formatAnswer(ordering, ["B", "A"])).toBe("B → A");
    expect(formatAnswer(ordering, [])).toBe("Javob berilmagan");
  });

  it("scores matching and ordering questions", () => {
    const questions: QuestionFull[] = [
      question({
        id: "match",
        type: "MATCHING",
        options: ["A", "B"],
        correct: ["1", "2"],
        points: 3,
      }),
      question({ id: "order", type: "ORDERING", options: ["X", "Y"], correct: [], points: 5 }),
    ];
    expect(autoScore(questions, { match: ["1", "2"], order: ["Y", "X"] })).toBe(3);
    expect(autoScore(questions, { match: ["1", "2"], order: ["X", "Y"] })).toBe(8);
  });
});

describe("autoScore", () => {
  it("sums points of every supported type", () => {
    const questions: QuestionFull[] = [
      question({ id: "single", type: "SINGLE", correct: [0], points: 1 }),
      question({ id: "tf", type: "TRUE_FALSE", options: ["To'g'ri", "Noto'g'ri"], correct: [1], points: 2 }),
      question({ id: "short", type: "SHORT_ANSWER", options: [], correct: ["Tashkent"], points: 3 }),
      question({ id: "num", type: "NUMERIC", options: [], correct: [7], points: 4 }),
    ];
    const answers: QuizAnswers = {
      single: 0,
      tf: 1,
      short: " tashkent ",
      num: "7",
    };
    expect(autoScore(questions, answers)).toBe(10);
  });

  it("skips unanswered questions", () => {
    const questions: QuestionFull[] = [
      question({ id: "num", type: "NUMERIC", options: [], correct: [7], points: 4 }),
    ];
    expect(autoScore(questions, {})).toBe(0);
  });
});
