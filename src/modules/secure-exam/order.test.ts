import { describe, expect, it } from "vitest";
import {
  optionPermutation,
  optionSeed,
  permutedOptions,
  remapAnswerToOriginal,
  remapAnswersToDisplay,
  remapAnswersToOriginal,
  shuffledQuestions,
} from "./order";

describe("shuffledQuestions", () => {
  const questions = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

  it("bir xil seed uchun deterministik", () => {
    const first = shuffledQuestions(questions, "attempt-1").map((question) => question.id);
    const second = shuffledQuestions(questions, "attempt-1").map((question) => question.id);
    expect(first).toEqual(second);
  });

  it("barcha elementlarni saqlaydi va tartibni o'zgartiradi", () => {
    const ids = shuffledQuestions(questions, "attempt-1").map((question) => question.id);
    expect([...ids].sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids).not.toEqual(["a", "b", "c", "d", "e"]);
  });

  it("bitta savol bo'lsa o'zini qaytaradi", () => {
    const single = [{ id: "only" }];
    expect(shuffledQuestions(single, "seed")).toBe(single);
  });
});

describe("optionPermutation", () => {
  it("biyeksiya: har bir original indeks bir marta uchraydi", () => {
    const order = optionPermutation(6, optionSeed("attempt-1", "question-1"));
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("2 tadan kam variant uchun identik", () => {
    expect(optionPermutation(0, "seed")).toEqual([]);
    expect(optionPermutation(1, "seed")).toEqual([0]);
  });
});

describe("permutedOptions", () => {
  it("ko'rsatiladigan tartib permutationga mos keladi", () => {
    const options = ["A", "B", "C", "D"];
    const seed = optionSeed("attempt-1", "question-1");
    const order = optionPermutation(options.length, seed);
    const displayed = permutedOptions(options, seed);
    expect(displayed).toEqual(order.map((original) => options[original]));
  });
});

describe("remapAnswerToOriginal", () => {
  const question = { id: "q1", options: ["A", "B", "C", "D"] };

  it("ko'rsatilgan indeksni original indeksga qaytaradi", () => {
    const seed = optionSeed("attempt-1", "q1");
    const order = optionPermutation(4, seed);
    const correctOriginal = 2;
    const displayIndex = order.indexOf(correctOriginal);
    expect(remapAnswerToOriginal(displayIndex, question, seed)).toBe(correctOriginal);
  });

  it("massiv indekslarni ham qayta hisoblaydi", () => {
    const seed = optionSeed("attempt-1", "q1");
    const order = optionPermutation(4, seed);
    const displayed = [order.indexOf(0), order.indexOf(3)];
    const remapped = remapAnswerToOriginal(displayed, question, seed);
    expect(remapped).toEqual([0, 3]);
  });

  it("matnli javobni o'zgartirmaydi", () => {
    const seed = optionSeed("attempt-1", "q1");
    expect(remapAnswerToOriginal("erkin javob", question, seed)).toBe("erkin javob");
  });
});

describe("remapAnswersToOriginal", () => {
  it("noma'lum savol id larini tashlab yuboradi", () => {
    const questions = [
      { id: "q1", options: ["A", "B", "C"] },
      { id: "q2", options: ["A", "B"] },
    ];
    const seed = optionSeed("attempt-1", "q1");
    const order = optionPermutation(3, seed);
    const answers = { q1: order.indexOf(1), q2: 0, unknown: 5 };
    const remapped = remapAnswersToOriginal(answers, questions, "attempt-1");
    expect(remapped.q1).toBe(1);
    expect(remapped.q2).toBe(0);
    expect("unknown" in remapped).toBe(false);
  });
});

describe("remapAnswersToDisplay", () => {
  it("original javoblarni ko'rsatiladigan indekslarga qaytaradi", () => {
    const questions = [
      { id: "q1", options: ["A", "B", "C", "D"] },
      { id: "q2", options: ["A", "B", "C"] },
    ];
    const original = { q1: 2, q2: [0, 2], q3: "matn" };
    const display = remapAnswersToDisplay(original, questions, "attempt-1");
    const back = remapAnswersToOriginal(display, questions, "attempt-1");
    expect(back.q1).toBe(2);
    expect(back.q2).toEqual([0, 2]);
    expect("q3" in display).toBe(false);
  });
});
