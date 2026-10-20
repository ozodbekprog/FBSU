import { describe, expect, it } from "vitest";
import { buildAttemptAnswerRows } from "./attempt-answers";
import type { QuestionFull } from "./shared";

const questions: QuestionFull[] = [
  {
    id: "single",
    text: "Bitta javob",
    type: "SINGLE",
    options: ["A", "B"],
    correct: [1],
    points: 2,
    position: 1,
  },
  {
    id: "multiple",
    text: "Ko'p javob",
    type: "MULTIPLE",
    options: ["A", "B", "C"],
    correct: [0, 2],
    points: 3,
    position: 2,
  },
  {
    id: "text",
    text: "Matn",
    type: "TEXT",
    options: [],
    correct: [],
    points: 5,
    position: 3,
  },
  {
    id: "essay",
    text: "Insho",
    type: "ESSAY",
    options: [],
    correct: [],
    points: 10,
    position: 4,
  },
  {
    id: "short",
    text: "Qisqa",
    type: "SHORT_ANSWER",
    options: [],
    correct: ["paris"],
    points: 1,
    position: 5,
  },
];

describe("attempt answer rows", () => {
  it("avtobaho savollarni ball va to'g'rilik bilan yozadi", () => {
    const rows = buildAttemptAnswerRows(questions, {
      single: 1,
      multiple: [0],
      text: "mening javobim",
      essay: "insho matni",
      short: "   ",
    });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      questionId: "single",
      score: 2,
      isCorrect: true,
    });
    expect(rows[1]).toMatchObject({
      questionId: "multiple",
      score: 0,
      isCorrect: false,
    });
    expect(rows[2]).toMatchObject({
      questionId: "text",
      score: null,
      isCorrect: null,
    });
    expect(rows[3]).toMatchObject({
      questionId: "essay",
      score: null,
      isCorrect: null,
    });
  });

  it("bo'sh javoblar uchun yozuv yaratmaydi", () => {
    expect(buildAttemptAnswerRows(questions, {})).toEqual([]);
    expect(buildAttemptAnswerRows(questions, { single: "", multiple: [] })).toEqual([]);
    expect(
      buildAttemptAnswerRows(questions, { single: "   ", multiple: ["", "  "] }),
    ).toEqual([]);
  });

  it("noto'g'ri avtobaho javobni 0 ball bilan saqlaydi", () => {
    const rows = buildAttemptAnswerRows(questions, { short: "london" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      questionId: "short",
      score: 0,
      isCorrect: false,
    });
  });
});
