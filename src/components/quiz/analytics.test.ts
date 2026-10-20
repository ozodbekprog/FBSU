import { describe, expect, it } from "vitest";
import { buildQuestionStats, rowsFromAttempts } from "./analytics";
import type { QuestionFull } from "./shared";

const questions: QuestionFull[] = [
  {
    id: "q1",
    text: "Bitta javob",
    type: "SINGLE",
    options: ["A", "B"],
    correct: [1],
    points: 2,
    position: 1,
  },
  {
    id: "q2",
    text: "Matn",
    type: "TEXT",
    options: [],
    correct: [],
    points: 5,
    position: 2,
  },
  {
    id: "q3",
    text: "Qisqa",
    type: "SHORT_ANSWER",
    options: [],
    correct: ["paris"],
    points: 1,
    position: 3,
  },
];

describe("quiz question analytics", () => {
  it("savol bo'yicha javob, to'g'ri va o'rtacha ballni hisoblaydi", () => {
    const stats = buildQuestionStats(questions, [
      { questionId: "q1", isCorrect: true, score: 2 },
      { questionId: "q1", isCorrect: false, score: 0 },
      { questionId: "q2", isCorrect: null, score: null },
      { questionId: "q3", isCorrect: true, score: 1 },
    ]);

    expect(stats).toEqual([
      {
        questionId: "q1",
        answered: 2,
        correct: 1,
        pending: 0,
        averageScore: 1,
      },
      {
        questionId: "q2",
        answered: 1,
        correct: 0,
        pending: 1,
        averageScore: null,
      },
      {
        questionId: "q3",
        answered: 1,
        correct: 1,
        pending: 0,
        averageScore: 1,
      },
    ]);
  });

  it("javobsiz savollar uchun nol ko'rsatkich qaytaradi", () => {
    const stats = buildQuestionStats([{ id: "empty" }], []);
    expect(stats[0]).toEqual({
      questionId: "empty",
      answered: 0,
      correct: 0,
      pending: 0,
      averageScore: null,
    });
  });

  it("eski JSON javoblardan statistikani quradi", () => {
    const rows = rowsFromAttempts(questions, [
      {
        finishedAt: new Date("2026-10-20T10:00:00Z"),
        answers: { q1: 1, q2: "matn", q3: "paris" },
      },
      {
        finishedAt: new Date("2026-10-20T10:10:00Z"),
        answers: { q1: 0 },
      },
      {
        finishedAt: null,
        answers: { q1: 1 },
      },
    ]);

    expect(rows).toHaveLength(4);
    expect(rows).toContainEqual({ questionId: "q1", isCorrect: true, score: 2 });
    expect(rows).toContainEqual({ questionId: "q1", isCorrect: false, score: 0 });
    expect(rows).toContainEqual({ questionId: "q2", isCorrect: null, score: null });
    expect(rows).toContainEqual({ questionId: "q3", isCorrect: true, score: 1 });
  });
});
