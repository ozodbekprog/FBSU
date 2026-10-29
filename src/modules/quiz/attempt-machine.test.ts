import { describe, expect, it } from "vitest";
import { decideStart, isAttemptExpired, type AttemptSummary } from "./attempt-machine";

const NOW = new Date("2026-10-17T09:00:00.000Z");

function attempt(
  id: string,
  startedAt: string,
  finishedAt: string | null,
): AttemptSummary {
  return {
    id,
    startedAt: new Date(startedAt),
    finishedAt: finishedAt === null ? null : new Date(finishedAt),
  };
}

const FINISHED = attempt("a1", "2026-10-17T08:00:00.000Z", "2026-10-17T08:10:00.000Z");

describe("decideStart", () => {
  it("tugatilmagan urinish bo'lsa resume qiladi", () => {
    const open = attempt("a2", "2026-10-17T08:20:00.000Z", null);
    expect(decideStart([FINISHED, open], 3)).toEqual({ action: "resume", attemptId: "a2" });
  });

  it("bir nechta tugatilmagan urinishdan eng oxirgisini resume qiladi", () => {
    const first = attempt("a2", "2026-10-17T08:20:00.000Z", null);
    const second = attempt("a3", "2026-10-17T08:40:00.000Z", null);
    expect(decideStart([first, FINISHED, second], 3)).toEqual({
      action: "resume",
      attemptId: "a3",
    });
  });

  it("urinishlar yo'q bo'lsa yangi urinish boshlanadi", () => {
    expect(decideStart([], 2)).toEqual({ action: "start" });
  });

  it("chegaraga yetmagan tugatilgan urinishlar yangi urinishga ruxsat beradi", () => {
    expect(decideStart([FINISHED], 2)).toEqual({ action: "start" });
  });

  it("tugatilganlar soni limitga teng bo'lsa blocked", () => {
    const second = attempt("a2", "2026-10-17T08:20:00.000Z", "2026-10-17T08:30:00.000Z");
    expect(decideStart([FINISHED, second], 2)).toEqual({ action: "blocked", reason: "limit" });
  });

  it("tugatilganlar soni limitdan ko'p bo'lsa blocked", () => {
    const second = attempt("a2", "2026-10-17T08:20:00.000Z", "2026-10-17T08:30:00.000Z");
    const third = attempt("a3", "2026-10-17T08:40:00.000Z", "2026-10-17T08:45:00.000Z");
    expect(decideStart([FINISHED, second, third], 2)).toEqual({
      action: "blocked",
      reason: "limit",
    });
  });

  it("limit null bo'lsa tugatilgan urinishlar to'smaydi", () => {
    expect(decideStart([FINISHED, FINISHED], null)).toEqual({ action: "start" });
  });

  it("limit undefined bo'lsa tugatilgan urinishlar to'smaydi", () => {
    expect(decideStart([FINISHED, FINISHED], undefined)).toEqual({ action: "start" });
  });

  it("limit 0 bo'lsa cheksiz urinish deb qaraladi", () => {
    expect(decideStart([FINISHED, FINISHED], 0)).toEqual({ action: "start" });
  });
});

describe("isAttemptExpired", () => {
  it("vaqt tugagan tugatilmagan urinish expired", () => {
    const open = attempt("a1", "2026-10-17T08:00:00.000Z", null);
    expect(isAttemptExpired(open, 30, NOW)).toBe(true);
  });

  it("vaqt tugamagan urinish expired emas", () => {
    const open = attempt("a1", "2026-10-17T08:45:00.000Z", null);
    expect(isAttemptExpired(open, 30, NOW)).toBe(false);
  });

  it("chegaraga teng vaqtda expired emas", () => {
    const open = attempt("a1", "2026-10-17T08:30:00.000Z", null);
    expect(isAttemptExpired(open, 30, NOW)).toBe(false);
  });

  it("tugatilgan urinish expired emas", () => {
    expect(isAttemptExpired(FINISHED, 10, NOW)).toBe(false);
  });

  it("timeLimit yo'q bo'lsa expired emas", () => {
    const open = attempt("a1", "2026-10-17T08:00:00.000Z", null);
    expect(isAttemptExpired(open, null, NOW)).toBe(false);
    expect(isAttemptExpired(open, undefined, NOW)).toBe(false);
  });

  it("timeLimit 0 yoki manfiy bo'lsa expired emas", () => {
    const open = attempt("a1", "2026-10-17T08:00:00.000Z", null);
    expect(isAttemptExpired(open, 0, NOW)).toBe(false);
    expect(isAttemptExpired(open, -5, NOW)).toBe(false);
  });
});
