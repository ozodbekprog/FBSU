import { RUN_STALE_MS } from "./config";
import type { LimitAction } from "./types";

export function effectiveDeadline(input: {
  startedAt: Date;
  durationMin: number | null;
  sittingEndsAt: Date;
  extraMin: number;
}): Date | null {
  const sittingEnd = input.sittingEndsAt.getTime();
  if (input.durationMin === null) return new Date(sittingEnd);
  const personalEnd =
    input.startedAt.getTime() + (input.durationMin + input.extraMin) * 60_000;
  return new Date(Math.min(personalEnd, sittingEnd));
}

export function remainingSeconds(deadline: Date | null, now: Date): number | null {
  if (!deadline) return null;
  return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
}

export function shouldTerminate(
  warnings: number,
  maxWarnings: number,
  action: LimitAction,
): boolean {
  if (action !== "TERMINATE") return false;
  if (maxWarnings <= 0) return false;
  return warnings >= maxWarnings;
}

export function isRunOnline(
  lastSeenAt: Date | null,
  now: Date,
  staleMs: number = RUN_STALE_MS,
): boolean {
  if (!lastSeenAt) return false;
  return now.getTime() - lastSeenAt.getTime() <= staleMs;
}

export function isExamWindowOpen(startsAt: Date, endsAt: Date, now: Date): boolean {
  return now.getTime() >= startsAt.getTime() && now.getTime() <= endsAt.getTime();
}
