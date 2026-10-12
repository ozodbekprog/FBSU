import type { AnswerValue, QuizAnswers } from "@/components/quiz/shared";

type OptionedQuestion = {
  id: string;
  options: readonly unknown[];
};

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}

export function shuffledQuestions<T extends { id: string }>(questions: T[], seed: string): T[] {
  if (questions.length < 2) return questions;
  return shuffleWith(questions, randomFromSeed(hashSeed(seed)));
}

export function optionPermutation(count: number, seed: string): number[] {
  if (count < 2) return Array.from({ length: count }, (_, index) => index);
  return shuffleWith(
    Array.from({ length: count }, (_, index) => index),
    randomFromSeed(hashSeed(seed)),
  );
}

export function permutedOptions<T>(options: readonly T[], seed: string): T[] {
  return optionPermutation(options.length, seed).map((original) => options[original]);
}

export function optionSeed(attemptId: string, questionId: string): string {
  return `${attemptId}:${questionId}`;
}

export function remapAnswerToOriginal(
  value: AnswerValue,
  question: OptionedQuestion,
  seed: string,
): AnswerValue {
  if (typeof value !== "number" && !Array.isArray(value)) return value;
  const order = optionPermutation(question.options.length, seed);
  if (typeof value === "number") {
    return order[value] ?? value;
  }
  return value.map((index) => order[index] ?? index);
}

export function remapAnswersToOriginal(
  answers: QuizAnswers,
  questions: OptionedQuestion[],
  attemptId: string,
): QuizAnswers {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const result: QuizAnswers = {};
  for (const [questionId, value] of Object.entries(answers)) {
    const question = byId.get(questionId);
    if (!question) continue;
    result[questionId] = remapAnswerToOriginal(
      value,
      question,
      optionSeed(attemptId, questionId),
    );
  }
  return result;
}

export function remapAnswersToDisplay(
  answers: QuizAnswers,
  questions: OptionedQuestion[],
  attemptId: string,
): QuizAnswers {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const result: QuizAnswers = {};
  for (const [questionId, value] of Object.entries(answers)) {
    const question = byId.get(questionId);
    if (!question) continue;
    const order = optionPermutation(
      question.options.length,
      optionSeed(attemptId, questionId),
    );
    const toDisplay = (original: number): number => {
      const display = order.indexOf(original);
      return display >= 0 ? display : original;
    };
    if (typeof value === "number") {
      result[questionId] = toDisplay(value);
    } else if (Array.isArray(value)) {
      result[questionId] = value.map(toDisplay);
    } else {
      result[questionId] = value;
    }
  }
  return result;
}
