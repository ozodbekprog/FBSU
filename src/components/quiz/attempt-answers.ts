import {
  isAnswerCorrect,
  type AnswerValue,
  type QuestionFull,
  type QuizAnswers,
} from "@/components/quiz/shared";

export type AttemptAnswerRow = {
  questionId: string;
  answer: AnswerValue;
  score: number | null;
  isCorrect: boolean | null;
};

export function isManualQuestion(type: QuestionFull["type"]): boolean {
  return type === "TEXT" || type === "ESSAY";
}

export function isEmptyAnswer(value: AnswerValue): boolean {
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) {
    return (
      value.length === 0 ||
      value.every((item) => typeof item === "string" && item.trim().length === 0)
    );
  }
  return false;
}

export function buildAttemptAnswerRows(
  questions: QuestionFull[],
  answers: QuizAnswers,
): AttemptAnswerRow[] {
  const rows: AttemptAnswerRow[] = [];
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined || isEmptyAnswer(answer)) continue;
    if (isManualQuestion(question.type)) {
      rows.push({
        questionId: question.id,
        answer,
        score: null,
        isCorrect: null,
      });
      continue;
    }
    const correct = isAnswerCorrect(question, answer);
    rows.push({
      questionId: question.id,
      answer,
      score: correct ? question.points : 0,
      isCorrect: correct,
    });
  }
  return rows;
}
