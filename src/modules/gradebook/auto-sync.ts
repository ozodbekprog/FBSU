export type AutoSyncItem = { id: string; source: "ASSIGNMENT" | "QUIZ"; refId: string; maxScore: number };

export type AutoSyncScore = { itemId: string; studentId: string; score: number };

export function collectAutoScores(
  items: AutoSyncItem[],
  submissions: ReadonlyArray<{ assignmentId: string; studentId: string; score: number | null }>,
  attempts: ReadonlyArray<{ quizId: string; studentId: string; score: number | null }>,
): AutoSyncScore[] {
  const submissionIndex = new Map<string, number>();
  for (const submission of submissions) {
    if (submission.score === null) continue;
    submissionIndex.set(`${submission.assignmentId}::${submission.studentId}`, submission.score);
  }

  const attemptIndex = new Map<string, number>();
  for (const attempt of attempts) {
    if (attempt.score === null) continue;
    const key = `${attempt.quizId}::${attempt.studentId}`;
    const existing = attemptIndex.get(key);
    if (existing === undefined || attempt.score > existing) {
      attemptIndex.set(key, attempt.score);
    }
  }

  const results: AutoSyncScore[] = [];
  for (const item of items) {
    const prefix = `${item.refId}::`;
    const source = item.source === "ASSIGNMENT" ? submissionIndex : attemptIndex;
    for (const [key, raw] of source) {
      if (!key.startsWith(prefix)) continue;
      const studentId = key.slice(prefix.length);
      const score = Math.min(item.maxScore, Math.max(0, raw));
      results.push({ itemId: item.id, studentId, score });
    }
  }

  results.sort((a, b) => {
    if (a.itemId !== b.itemId) return a.itemId < b.itemId ? -1 : 1;
    if (a.studentId !== b.studentId) return a.studentId < b.studentId ? -1 : 1;
    return 0;
  });

  return results;
}
