import {
  asAnswers,
  isAnswerCorrect,
  type QuestionFull,
} from "@/components/quiz/shared";
import { isEmptyAnswer, isManualQuestion } from "@/components/quiz/attempt-answers";

export type QuestionAnswerStatRow = {
  questionId: string;
  isCorrect: boolean | null;
  score: number | null;
};

export type QuestionStat = {
  questionId: string;
  answered: number;
  correct: number;
  pending: number;
  averageScore: number | null;
};

export function buildQuestionStats(
  questions: Array<{ id: string }>,
  rows: QuestionAnswerStatRow[],
): QuestionStat[] {
  const byQuestion = new Map<string, QuestionAnswerStatRow[]>();
  for (const row of rows) {
    const list = byQuestion.get(row.questionId);
    if (list) list.push(row);
    else byQuestion.set(row.questionId, [row]);
  }

  return questions.map((question) => {
    const list = byQuestion.get(question.id) ?? [];
    const scored = list.filter((row) => row.score !== null);
    const averageScore =
      scored.length > 0
        ? Math.round(
            (scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length) * 10,
          ) / 10
        : null;

    return {
      questionId: question.id,
      answered: list.length,
      correct: list.filter((row) => row.isCorrect === true).length,
      pending: list.filter((row) => row.score === null && row.isCorrect === null).length,
      averageScore,
    };
  });
}

export function rowsFromAttempts(
  questions: QuestionFull[],
  attempts: Array<{ answers: unknown; finishedAt: Date | null }>,
): QuestionAnswerStatRow[] {
  const rows: QuestionAnswerStatRow[] = [];
  for (const attempt of attempts) {
    if (!attempt.finishedAt) continue;
    const answers = asAnswers(attempt.answers);
    for (const question of questions) {
      const answer = answers[question.id];
      if (answer === undefined || isEmptyAnswer(answer)) continue;
      if (isManualQuestion(question.type)) {
        rows.push({ questionId: question.id, isCorrect: null, score: null });
        continue;
      }
      const correct = isAnswerCorrect(question, answer);
      rows.push({
        questionId: question.id,
        isCorrect: correct,
        score: correct ? question.points : 0,
      });
    }
  }
  return rows;
}
