import type { Question } from "@prisma/client";
import type { Dictionary } from "@/i18n/uz";

export type QuestionType = "SINGLE" | "MULTIPLE" | "TEXT" | "TRUE_FALSE" | "SHORT_ANSWER" | "NUMERIC";

export type CorrectValue = number | string;

export type AnswerValue = number | number[] | string;
export type QuizAnswers = Record<string, AnswerValue>;

export type QuestionFull = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correct: CorrectValue[];
  points: number;
  position: number;
};

export type QuestionPublic = Omit<QuestionFull, "correct">;

export type QuestionDraft = {
  text: string;
  type: QuestionType;
  options: string[];
  correct: CorrectValue[];
  points: number;
};

export const TRUE_FALSE_OPTIONS = ["To'g'ri", "Noto'g'ri"] as const;

export function isTrueFalseOptions(options: string[]): boolean {
  return (
    options.length === TRUE_FALSE_OPTIONS.length &&
    TRUE_FALSE_OPTIONS.every((value, index) => options[index] === value)
  );
}

export const QUESTION_TYPES: QuestionType[] = [
  "SINGLE",
  "MULTIPLE",
  "TEXT",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "NUMERIC",
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: "Bitta to'g'ri javob",
  MULTIPLE: "Bir nechta to'g'ri javob",
  TEXT: "Matnli javob (qo'lda)",
  TRUE_FALSE: "To'g'ri / Noto'g'ri",
  SHORT_ANSWER: "Qisqa javob",
  NUMERIC: "Raqamli javob",
};

export const QUESTION_TYPE_KEY: Record<QuestionType, keyof Dictionary> = {
  SINGLE: "crsQuizTypeSingle",
  MULTIPLE: "crsQuizTypeMultiple",
  TEXT: "crsQuizTypeText",
  TRUE_FALSE: "crsQuizTypeTrueFalse",
  SHORT_ANSWER: "crsQuizTypeShortAnswer",
  NUMERIC: "crsQuizTypeNumeric",
};

export const QUESTION_TYPE_TONE: Record<QuestionType, "brand" | "purple" | "amber"> = {
  SINGLE: "brand",
  MULTIPLE: "purple",
  TEXT: "amber",
  TRUE_FALSE: "brand",
  SHORT_ANSWER: "amber",
  NUMERIC: "purple",
};

export const QUESTION_TYPE_ACCENT: Record<QuestionType, string> = {
  SINGLE: "bg-brand-500",
  MULTIPLE: "bg-purple-500",
  TEXT: "bg-amber-500",
  TRUE_FALSE: "bg-emerald-500",
  SHORT_ANSWER: "bg-sky-500",
  NUMERIC: "bg-slate-500",
};

export const QUESTION_TYPE_SOFT: Record<QuestionType, string> = {
  SINGLE: "bg-brand-50 text-brand-800",
  MULTIPLE: "bg-purple-50 text-purple-700",
  TEXT: "bg-amber-50 text-amber-700",
  TRUE_FALSE: "bg-emerald-50 text-emerald-700",
  SHORT_ANSWER: "bg-sky-50 text-sky-700",
  NUMERIC: "bg-slate-100 text-slate-700",
};

export const QUESTION_TYPE_ICON: Record<QuestionType, string> = {
  SINGLE: "M9 12.75 11.25 15 15 9.75",
  MULTIPLE: "M4.5 12.75l6 6 9-13.5",
  TEXT: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12",
  TRUE_FALSE: "M5 13l4 4L19 7",
  SHORT_ANSWER: "M4 7h16M4 12h10M4 17h7",
  NUMERIC: "M7 4v16M17 4v16M4 9h6M14 9h6M4 15h6M14 15h6",
};

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isInteger(item));
}

export function asCorrectArray(value: unknown): CorrectValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CorrectValue =>
      typeof item === "string" || (typeof item === "number" && Number.isFinite(item)),
  );
}

export function parseAcceptedAnswers(value: string): string[] {
  const answers = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const answer of answers) {
    const key = answer.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(answer);
  }
  return result;
}

export function asAnswers(value: unknown): QuizAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: QuizAnswers = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" || typeof item === "string") {
      result[key] = item;
    } else if (Array.isArray(item)) {
      result[key] = item.filter((entry): entry is number => typeof entry === "number");
    }
  }
  return result;
}

export function toQuestionFull(
  question: Pick<Question, "id" | "text" | "type" | "options" | "correct" | "points" | "position">,
): QuestionFull {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    options: asStringArray(question.options),
    correct: asCorrectArray(question.correct),
    points: question.points,
    position: question.position,
  };
}

export function toQuestionPublic(question: QuestionFull): QuestionPublic {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options,
    points: question.points,
    position: question.position,
  };
}

export function totalPoints(questions: Array<{ points: number }>): number {
  return questions.reduce((sum, question) => sum + question.points, 0);
}

export function hasTextQuestions(questions: Array<{ type: QuestionType }>): boolean {
  return questions.some((question) => question.type === "TEXT");
}

export function normalizeShortAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function correctNumbers(question: QuestionFull): number[] {
  return question.correct.filter((item): item is number => typeof item === "number");
}

function correctStrings(question: QuestionFull): string[] {
  return question.correct.filter((item): item is string => typeof item === "string");
}

export function isAnswerCorrect(question: QuestionFull, answer: AnswerValue | undefined): boolean {
  if (question.type === "TRUE_FALSE") {
    const expected = correctNumbers(question).filter((value) => value === 0 || value === 1);
    return typeof answer === "number" && expected.length === 1 && answer === expected[0];
  }
  if (question.type === "SINGLE") {
    const expected = correctNumbers(question);
    return typeof answer === "number" && expected.length === 1 && answer === expected[0];
  }
  if (question.type === "MULTIPLE") {
    if (!Array.isArray(answer)) return false;
    const expected = correctNumbers(question);
    const selected = [...new Set(answer)].sort((a, b) => a - b);
    const sorted = [...new Set(expected)].sort((a, b) => a - b);
    return selected.length === sorted.length && selected.every((value, index) => value === sorted[index]);
  }
  if (question.type === "SHORT_ANSWER") {
    if (typeof answer !== "string") return false;
    const normalized = normalizeShortAnswer(answer);
    if (normalized.length === 0) return false;
    return correctStrings(question).some((item) => normalizeShortAnswer(item) === normalized);
  }
  if (question.type === "NUMERIC") {
    const expected = correctNumbers(question);
    if (expected.length !== 1) return false;
    if (typeof answer === "string" && answer.trim().length === 0) return false;
    if (typeof answer !== "string" && typeof answer !== "number") return false;
    const given = typeof answer === "string" ? Number(answer.trim()) : answer;
    return Number.isFinite(given) && given === expected[0];
  }
  return false;
}

export function autoScore(questions: QuestionFull[], answers: QuizAnswers): number {
  return questions.reduce((sum, question) => {
    return isAnswerCorrect(question, answers[question.id]) ? sum + question.points : sum;
  }, 0);
}

export function formatAnswer(question: QuestionFull, answer: AnswerValue | undefined): string {
  if (answer === undefined || answer === null) return "Javob berilmagan";
  if (question.type === "TEXT" || question.type === "SHORT_ANSWER") {
    return typeof answer === "string" && answer.trim().length > 0 ? answer : "Javob berilmagan";
  }
  if (question.type === "NUMERIC") {
    if (typeof answer === "number") return String(answer);
    if (typeof answer === "string" && answer.trim().length > 0) return answer;
    return "Javob berilmagan";
  }
  const indexes = typeof answer === "number" ? [answer] : Array.isArray(answer) ? answer : [];
  const labels = indexes
    .filter((index) => index >= 0 && index < question.options.length)
    .map((index) => question.options[index]);
  return labels.length > 0 ? labels.join(", ") : "Javob berilmagan";
}
