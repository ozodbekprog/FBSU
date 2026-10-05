import { describe, expect, it } from "vitest";
import { currentLesson, lessonState, minutesUntilStart, tashkentClock } from "./lesson-window";

const MONDAY_0905 = new Date("2026-10-05T04:05:00.000Z");
const MONDAY_0845 = new Date("2026-10-05T03:45:00.000Z");
const MONDAY_1330 = new Date("2026-10-05T08:30:00.000Z");
const SUNDAY_1000 = new Date("2026-10-11T05:00:00.000Z");

describe("tashkentClock", () => {
  it("Toshkent vaqtini kun va daqiqada qaytaradi", () => {
    expect(tashkentClock(MONDAY_0905)).toEqual({ dayOfWeek: 1, minutes: 545 });
  });

  it("yakshanbani 7 kun sifatida qaytaradi", () => {
    expect(tashkentClock(SUNDAY_1000)).toEqual({ dayOfWeek: 7, minutes: 600 });
  });
});

describe("lessonState", () => {
  const mondaySlot1 = { id: "a", dayOfWeek: 1, slot: 1 };

  it("dars davomida ongoing qaytaradi", () => {
    expect(lessonState(mondaySlot1, MONDAY_0905)).toBe("ongoing");
  });

  it("15 daqiqa oldin upcoming qaytaradi", () => {
    expect(lessonState(mondaySlot1, MONDAY_0845)).toBe("upcoming");
  });

  it("boshqa kunda null qaytaradi", () => {
    expect(lessonState(mondaySlot1, SUNDAY_1000)).toBeNull();
  });

  it("dars tugagach null qaytaradi", () => {
    expect(lessonState({ id: "b", dayOfWeek: 1, slot: 3 }, MONDAY_1330)).toBeNull();
  });
});

describe("currentLesson", () => {
  it("davom etayotgan darsni ustuvor tanlaydi", () => {
    const entries = [
      { id: "up", dayOfWeek: 1, slot: 2 },
      { id: "now", dayOfWeek: 1, slot: 1 },
    ];
    expect(currentLesson(entries, MONDAY_0905)?.id).toBe("now");
  });

  it("dars yo'q bo'lsa null qaytaradi", () => {
    expect(currentLesson([{ id: "a", dayOfWeek: 3, slot: 1 }], MONDAY_0905)).toBeNull();
  });
});

describe("minutesUntilStart", () => {
  it("boshlanishga qolgan daqiqani hisoblaydi", () => {
    expect(minutesUntilStart({ id: "a", dayOfWeek: 1, slot: 1 }, MONDAY_0845)).toBe(15);
  });
});
