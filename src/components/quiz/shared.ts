import type { Question } from "@prisma/client";
import type { Dictionary } from "@/i18n/uz";

export type QuestionType =
  | "SINGLE"
  | "MULTIPLE"
  | "TEXT"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "NUMERIC"
  | "MATCHING"
  | "ORDERING"
  | "CLOZE"
  | "ESSAY";

export type CorrectValue = number | string;

export type AnswerValue = number | number[] | string | string[];
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

export type QuestionPublic = Omit<QuestionFull, "correct"> & { matchOptions?: string[] };

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
  "MATCHING",
  "ORDERING",
  "CLOZE",
  "ESSAY",
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: "Bitta to'g'ri javob",
  MULTIPLE: "Bir nechta to'g'ri javob",
  TEXT: "Matnli javob (qo'lda)",
  TRUE_FALSE: "To'g'ri / Noto'g'ri",
  SHORT_ANSWER: "Qisqa javob",
  NUMERIC: "Raqamli javob",
  MATCHING: "Moslashtirish",
  ORDERING: "Tartiblash",
  CLOZE: "Bo'sh joyni to'ldirish",
  ESSAY: "Insho (qo'lda baholanadi)",
};

export const QUESTION_TYPE_KEY: Record<QuestionType, keyof Dictionary> = {
  SINGLE: "crsQuizTypeSingle",
  MULTIPLE: "crsQuizTypeMultiple",
  TEXT: "crsQuizTypeText",
  TRUE_FALSE: "crsQuizTypeTrueFalse",
  SHORT_ANSWER: "crsQuizTypeShortAnswer",
  NUMERIC: "crsQuizTypeNumeric",
  MATCHING: "crsQuizTypeMatching",
  ORDERING: "crsQuizTypeOrdering",
  CLOZE: "crsQuizTypeCloze",
  ESSAY: "crsQuizTypeEssay",
};

export const QUESTION_TYPE_TONE: Record<QuestionType, "brand" | "purple" | "amber"> = {
  SINGLE: "brand",
  MULTIPLE: "purple",
  TEXT: "amber",
  TRUE_FALSE: "brand",
  SHORT_ANSWER: "amber",
  NUMERIC: "purple",
  MATCHING: "brand",
  ORDERING: "purple",
  CLOZE: "purple",
  ESSAY: "amber",
};

export const QUESTION_TYPE_ACCENT: Record<QuestionType, string> = {
  SINGLE: "bg-brand-500",
  MULTIPLE: "bg-purple-500",
  TEXT: "bg-amber-500",
  TRUE_FALSE: "bg-emerald-500",
  SHORT_ANSWER: "bg-sky-500",
  NUMERIC: "bg-slate-500",
  MATCHING: "bg-teal-500",
  ORDERING: "bg-indigo-500",
  CLOZE: "bg-fuchsia-500",
  ESSAY: "bg-rose-500",
};

export const QUESTION_TYPE_SOFT: Record<QuestionType, string> = {
  SINGLE: "bg-brand-50 text-brand-800",
  MULTIPLE: "bg-purple-50 text-purple-700",
  TEXT: "bg-amber-50 text-amber-700",
  TRUE_FALSE: "bg-emerald-50 text-emerald-700",
  SHORT_ANSWER: "bg-sky-50 text-sky-700",
  NUMERIC: "bg-slate-100 text-slate-700",
  MATCHING: "bg-teal-50 text-teal-700",
  ORDERING: "bg-indigo-50 text-indigo-700",
  CLOZE: "bg-fuchsia-50 text-fuchsia-700",
  ESSAY: "bg-rose-50 text-rose-700",
};

export const QUESTION_TYPE_ICON: Record<QuestionType, string> = {
  SINGLE: "M9 12.75 11.25 15 15 9.75",
  MULTIPLE: "M4.5 12.75l6 6 9-13.5",
  TEXT: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12",
  TRUE_FALSE: "M5 13l4 4L19 7",
  SHORT_ANSWER: "M4 7h16M4 12h10M4 17h7",
  NUMERIC: "M7 4v16M17 4v16M4 9h6M14 9h6M4 15h6M14 15h6",
  MATCHING: "M4 7h6M14 7h6M10 7l4 10M14 17H4M20 17h-6",
  ORDERING: "M4 6h10M4 12h13M4 18h7M18 5v14m0 0 3-3m-3 3-3-3",
  CLOZE: "M4 7h5M15 7h5M4 17h5M15 17h5M9 4v16M15 4v16",
  ESSAY: "M6 3h9l5 5v13H6zM14 3v6h6M9 13h7M9 17h5",
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

export function parseLineItems(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseClozeAnswers(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function clozeBlankNumbers(text: string): number[] {
  const seen = new Set<number>();
  const pattern = /\[\[(\d+)\]\]/g;
  let match = pattern.exec(text);
  while (match !== null) {
    const value = Number(match[1]);
    if (Number.isInteger(value) && value >= 1 && !seen.has(value)) seen.add(value);
    match = pattern.exec(text);
  }
  return [...seen].sort((a, b) => a - b);
}

export const CLOZE_MARKER_PATTERN = /\[\[(\d+)\]\]/g;

export function clozeVariants(option: string): string[] {
  return option
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function isClozeGraded(question: QuestionFull, answer: AnswerValue | undefined): boolean {
  if (!Array.isArray(answer)) return false;
  const given = answer.filter((item): item is string => typeof item === "string");
  if (given.length !== question.options.length || question.options.length === 0) return false;
  return question.options.every((option, index) => {
    const normalized = normalizeShortAnswer(given[index] ?? "");
    if (normalized.length === 0) return false;
    return clozeVariants(option).some((variant) => normalizeShortAnswer(variant) === normalized);
  });
}

export function asAnswers(value: unknown): QuizAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: QuizAnswers = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "number" || typeof item === "string") {
      result[key] = item;
    } else if (Array.isArray(item)) {
      const numbers = asNumberArray(item);
      result[key] = numbers.length === item.length ? numbers : asStringArray(item);
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
  const base: Omit<QuestionFull, "correct"> = {
    id: question.id,
    text: question.text,
    type: question.type,
    options: question.options,
    points: question.points,
    position: question.position,
  };
  if (question.type !== "MATCHING") return base;
  const seen = new Set<string>();
  const matchOptions: string[] = [];
  for (const value of correctStrings(question)) {
    if (seen.has(value)) continue;
    seen.add(value);
    matchOptions.push(value);
  }
  return { ...base, matchOptions };
}

export function totalPoints(questions: Array<{ points: number }>): number {
  return questions.reduce((sum, question) => sum + question.points, 0);
}

export function hasTextQuestions(questions: Array<{ type: QuestionType }>): boolean {
  return questions.some((question) => question.type === "TEXT" || question.type === "ESSAY");
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
    const given = answer.filter((item): item is number => typeof item === "number");
    const expected = correctNumbers(question);
    const selected = [...new Set(given)].sort((a, b) => a - b);
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
  if (question.type === "MATCHING") {
    if (!Array.isArray(answer)) return false;
    const given = answer.filter((item): item is string => typeof item === "string");
    const expected = correctStrings(question);
    if (given.length !== expected.length || expected.length === 0) return false;
    return expected.every((value, index) => given[index] === value);
  }
  if (question.type === "ORDERING") {
    if (!Array.isArray(answer)) return false;
    const given = answer.filter((item): item is string => typeof item === "string");
    if (given.length !== question.options.length || question.options.length < 2) return false;
    return question.options.every((value, index) => given[index] === value);
  }
  if (question.type === "CLOZE") {
    return isClozeGraded(question, answer);
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
  if (question.type === "MATCHING") {
    const given = Array.isArray(answer)
      ? answer.filter((item): item is string => typeof item === "string")
      : [];
    const pairs = question.options
      .map((left, index) => {
        const right = given[index];
        return right !== undefined && right.trim().length > 0 ? `${left} → ${right}` : null;
      })
      .filter((item): item is string => item !== null);
    return pairs.length > 0 ? pairs.join("\n") : "Javob berilmagan";
  }
  if (question.type === "ORDERING") {
    const given = Array.isArray(answer)
      ? answer.filter((item): item is string => typeof item === "string")
      : [];
    return given.length > 0 ? given.join(" → ") : "Javob berilmagan";
  }
  if (question.type === "TEXT" || question.type === "SHORT_ANSWER" || question.type === "ESSAY") {
    return typeof answer === "string" && answer.trim().length > 0 ? answer : "Javob berilmagan";
  }
  if (question.type === "CLOZE") {
    const given = Array.isArray(answer)
      ? answer.filter((item): item is string => typeof item === "string")
      : [];
    const rows = question.options.map((_, index) => {
      const value = given[index]?.trim() ?? "";
      return `[[${index + 1}]] → ${value.length > 0 ? value : "—"}`;
    });
    return rows.length > 0 ? rows.join("\n") : "Javob berilmagan";
  }
  if (question.type === "NUMERIC") {
    if (typeof answer === "number") return String(answer);
    if (typeof answer === "string" && answer.trim().length > 0) return answer;
    return "Javob berilmagan";
  }
  const indexes =
    typeof answer === "number"
      ? [answer]
      : Array.isArray(answer)
        ? answer.filter((item): item is number => typeof item === "number")
        : [];
  const labels = indexes
    .filter((index) => index >= 0 && index < question.options.length)
    .map((index) => question.options[index]);
  return labels.length > 0 ? labels.join(", ") : "Javob berilmagan";
}
