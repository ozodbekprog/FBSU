import { describe, expect, it } from "vitest";
import { collectAutoScores, type AutoSyncItem } from "./auto-sync";

describe("collectAutoScores", () => {
  it("assignment bahosini item'ga bog'laydi", () => {
    const items: AutoSyncItem[] = [{ id: "i1", source: "ASSIGNMENT", refId: "a1", maxScore: 100 }];
    const result = collectAutoScores(
      items,
      [{ assignmentId: "a1", studentId: "s1", score: 75 }],
      [],
    );
    expect(result).toEqual([{ itemId: "i1", studentId: "s1", score: 75 }]);
  });

  it("null bahoni o'tkazib yuboradi", () => {
    const items: AutoSyncItem[] = [{ id: "i1", source: "ASSIGNMENT", refId: "a1", maxScore: 100 }];
    const result = collectAutoScores(
      items,
      [
        { assignmentId: "a1", studentId: "s1", score: null },
        { assignmentId: "a1", studentId: "s2", score: 40 },
      ],
      [],
    );
    expect(result).toEqual([{ itemId: "i1", studentId: "s2", score: 40 }]);
  });

  it("quiz uchun eng yuqori urinishni oladi", () => {
    const items: AutoSyncItem[] = [{ id: "i1", source: "QUIZ", refId: "q1", maxScore: 100 }];
    const result = collectAutoScores(
      items,
      [],
      [
        { quizId: "q1", studentId: "s1", score: 30 },
        { quizId: "q1", studentId: "s1", score: 90 },
        { quizId: "q1", studentId: "s1", score: 60 },
      ],
    );
    expect(result).toEqual([{ itemId: "i1", studentId: "s1", score: 90 }]);
  });

  it("ballni 0..maxScore oralig'iga qisadi", () => {
    const items: AutoSyncItem[] = [
      { id: "i1", source: "ASSIGNMENT", refId: "a1", maxScore: 50 },
      { id: "i2", source: "QUIZ", refId: "q1", maxScore: 10 },
    ];
    const result = collectAutoScores(
      items,
      [{ assignmentId: "a1", studentId: "s1", score: 120 }],
      [{ quizId: "q1", studentId: "s1", score: -5 }],
    );
    expect(result).toEqual([
      { itemId: "i1", studentId: "s1", score: 50 },
      { itemId: "i2", studentId: "s1", score: 0 },
    ]);
  });

  it("aralash item'larni deterministik tartibda qaytaradi", () => {
    const items: AutoSyncItem[] = [
      { id: "i2", source: "QUIZ", refId: "q1", maxScore: 100 },
      { id: "i1", source: "ASSIGNMENT", refId: "a1", maxScore: 100 },
    ];
    const result = collectAutoScores(
      items,
      [{ assignmentId: "a1", studentId: "s2", score: 20 }],
      [{ quizId: "q1", studentId: "s1", score: 80 }],
    );
    expect(result).toEqual([
      { itemId: "i1", studentId: "s2", score: 20 },
      { itemId: "i2", studentId: "s1", score: 80 },
    ]);
  });

  it("mos yozuvlar bo'lmasa bo'sh massiv qaytaradi", () => {
    const items: AutoSyncItem[] = [{ id: "i1", source: "ASSIGNMENT", refId: "a1", maxScore: 100 }];
    expect(collectAutoScores(items, [], [])).toEqual([]);
    expect(collectAutoScores([], [{ assignmentId: "a1", studentId: "s1", score: 10 }], [])).toEqual([]);
  });
});
