import type { BankQuestion } from "@prisma/client";
import type { Dictionary } from "@/i18n";
import { asNumberArray, asStringArray, type QuestionType } from "@/components/quiz/shared";

export type BankQuestionItem = {
  id: string;
  courseId: string | null;
  subjectId: string | null;
  courseTitle: string | null;
  subjectName: string | null;
  text: string;
  type: QuestionType;
  options: string[];
  correct: number[];
  difficulty: number;
  createdAt: string;
};

export type BankQuestionDraft = {
  courseId: string | null;
  subjectId: string | null;
  text: string;
  type: QuestionType;
  options: string[];
  correct: number[];
  difficulty: number;
};

type BankQuestionWithRefs = BankQuestion & {
  course: { id: string; title: string } | null;
  subject: { id: string; name: string } | null;
};

export const DIFFICULTY_LABEL_KEYS: Record<number, keyof Dictionary> = {
  1: "grdQbDifficultyEasy",
  2: "grdQbDifficultyMedium",
  3: "grdQbDifficultyHard",
};

export const DIFFICULTY_TONE: Record<number, "green" | "amber" | "rose"> = {
  1: "green",
  2: "amber",
  3: "rose",
};

export const DIFFICULTY_ACTIVE: Record<number, string> = {
  1: "bg-emerald-600",
  2: "bg-amber-500",
  3: "bg-rose-600",
};

export function toBankQuestion(question: BankQuestionWithRefs): BankQuestionItem {
  return {
    id: question.id,
    courseId: question.courseId,
    subjectId: question.subjectId,
    courseTitle: question.course?.title ?? null,
    subjectName: question.subject?.name ?? null,
    text: question.text,
    type: question.type,
    options: asStringArray(question.options),
    correct: asNumberArray(question.correct),
    difficulty: question.difficulty,
    createdAt: question.createdAt.toISOString(),
  };
}
