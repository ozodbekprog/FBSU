export type AttemptSummary = { id: string; startedAt: Date; finishedAt: Date | null };

export type StartDecision =
  | { action: "resume"; attemptId: string }
  | { action: "start" }
  | { action: "blocked"; reason: "limit" };

export function decideStart(
  attempts: AttemptSummary[],
  limit: number | null | undefined,
): StartDecision {
  const unfinished = attempts.filter((attempt) => attempt.finishedAt === null);
  if (unfinished.length > 0) {
    let latest = unfinished[0];
    for (const attempt of unfinished) {
      if (attempt.startedAt.getTime() >= latest.startedAt.getTime()) latest = attempt;
    }
    return { action: "resume", attemptId: latest.id };
  }

  if (limit !== null && limit !== undefined && limit > 0) {
    const finishedCount = attempts.filter((attempt) => attempt.finishedAt !== null).length;
    if (finishedCount >= limit) return { action: "blocked", reason: "limit" };
  }

  return { action: "start" };
}

export function isAttemptExpired(
  attempt: { startedAt: Date; finishedAt: Date | null },
  timeLimitMinutes: number | null | undefined,
  now: Date,
): boolean {
  if (attempt.finishedAt !== null) return false;
  if (timeLimitMinutes === null || timeLimitMinutes === undefined) return false;
  if (timeLimitMinutes <= 0) return false;
  return now.getTime() - attempt.startedAt.getTime() > timeLimitMinutes * 60 * 1000;
}
