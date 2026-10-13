import { describe, expect, it } from "vitest";
import {
  effectiveDeadline,
  isExamWindowOpen,
  isRunOnline,
  remainingSeconds,
  shouldTerminate,
} from "./policy";

describe("effectiveDeadline", () => {
  it("shaxsiy vaqt tugashi va imtihon oynasi tugashidan kichigini oladi", () => {
    const startedAt = new Date("2026-10-12T10:00:00Z");
    const sittingEndsAt = new Date("2026-10-12T11:00:00Z");

    expect(
      effectiveDeadline({ startedAt, durationMin: 30, sittingEndsAt, extraMin: 0 })?.toISOString(),
    ).toBe("2026-10-12T10:30:00.000Z");

    expect(
      effectiveDeadline({ startedAt, durationMin: 90, sittingEndsAt, extraMin: 0 })?.toISOString(),
    ).toBe("2026-10-12T11:00:00.000Z");
  });

  it("qo'shimcha daqiqa hisobga olinadi", () => {
    const startedAt = new Date("2026-10-12T10:00:00Z");
    const sittingEndsAt = new Date("2026-10-12T12:00:00Z");
    expect(
      effectiveDeadline({ startedAt, durationMin: 30, sittingEndsAt, extraMin: 10 })?.toISOString(),
    ).toBe("2026-10-12T10:40:00.000Z");
  });

  it("davomiylik belgilanmagan bo'lsa oyna tugashini oladi", () => {
    const startedAt = new Date("2026-10-12T10:00:00Z");
    const sittingEndsAt = new Date("2026-10-12T11:00:00Z");
    expect(
      effectiveDeadline({ startedAt, durationMin: null, sittingEndsAt, extraMin: 5 })?.toISOString(),
    ).toBe("2026-10-12T11:00:00.000Z");
  });
});

describe("remainingSeconds", () => {
  it("qolgan sekundlarni butun qilib qaytaradi", () => {
    const deadline = new Date("2026-10-12T10:00:30Z");
    expect(remainingSeconds(deadline, new Date("2026-10-12T10:00:00Z"))).toBe(30);
    expect(remainingSeconds(deadline, new Date("2026-10-12T10:00:00.400Z"))).toBe(29);
  });

  it("vaqt o'tgan bo'lsa 0 qaytaradi, deadline yo'q bo'lsa null", () => {
    const deadline = new Date("2026-10-12T10:00:00Z");
    expect(remainingSeconds(deadline, new Date("2026-10-12T10:05:00Z"))).toBe(0);
    expect(remainingSeconds(null, new Date("2026-10-12T10:05:00Z"))).toBeNull();
  });
});

describe("shouldTerminate", () => {
  it("WARN rejimida hech qachon avtomatik to'xtatilmaydi", () => {
    expect(shouldTerminate(99, 3, "WARN")).toBe(false);
  });

  it("TERMINATE rejimida limitga yetganda to'xtatiladi", () => {
    expect(shouldTerminate(2, 3, "TERMINATE")).toBe(false);
    expect(shouldTerminate(3, 3, "TERMINATE")).toBe(true);
    expect(shouldTerminate(4, 3, "TERMINATE")).toBe(true);
  });
});

describe("isRunOnline", () => {
  it("oxirgi aloqa yaqin bo'lsa online", () => {
    const now = new Date("2026-10-12T10:00:00Z");
    expect(isRunOnline(new Date("2026-10-12T09:59:30Z"), now, 45_000)).toBe(true);
    expect(isRunOnline(new Date("2026-10-12T09:58:00Z"), now, 45_000)).toBe(false);
    expect(isRunOnline(null, now, 45_000)).toBe(false);
  });
});

describe("isExamWindowOpen", () => {
  it("oyna ichida va chegaralarda ochiq", () => {
    const startsAt = new Date("2026-10-12T10:00:00Z");
    const endsAt = new Date("2026-10-12T11:00:00Z");
    expect(isExamWindowOpen(startsAt, endsAt, new Date("2026-10-12T10:30:00Z"))).toBe(true);
    expect(isExamWindowOpen(startsAt, endsAt, startsAt)).toBe(true);
    expect(isExamWindowOpen(startsAt, endsAt, endsAt)).toBe(true);
    expect(isExamWindowOpen(startsAt, endsAt, new Date("2026-10-12T09:59:00Z"))).toBe(false);
    expect(isExamWindowOpen(startsAt, endsAt, new Date("2026-10-12T11:01:00Z"))).toBe(false);
  });
});
