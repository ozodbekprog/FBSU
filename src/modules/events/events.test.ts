import { describe, expect, it } from "vitest";
import {
  EVENTS,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  eventLabel,
  eventsByCategory,
  isEventName,
  type EventName,
} from "@/modules/events";

describe("event katalogi: butunlik", () => {
  it("har bir eventga label va to'g'ri kategoriya berilgan", () => {
    for (const [name, definition] of Object.entries(EVENTS)) {
      expect(definition.label.length, name).toBeGreaterThan(3);
      expect(EVENT_CATEGORIES, name).toContain(definition.category);
    }
  });

  it("har bir kategoriya uchun o'zbekcha label bor", () => {
    for (const category of EVENT_CATEGORIES) {
      expect(EVENT_CATEGORY_LABELS[category].length, category).toBeGreaterThan(3);
    }
  });

  it("katalog yetarli darajada to'liq", () => {
    expect(Object.keys(EVENTS).length).toBeGreaterThanOrEqual(60);
  });
});

describe("event katalogi: tekshiruvlar", () => {
  it("mavjud eventni taniydi, noma'lumni rad etadi", () => {
    expect(isEventName("LOGIN_SUCCESS")).toBe(true);
    expect(isEventName("submission.grade")).toBe(true);
    expect(isEventName("bold")).toBe(false);
    expect(isEventName("qwerty")).toBe(false);
  });

  it("kategoriya bo'yicha filtrlaydi", () => {
    const gradeEvents = eventsByCategory("grades");
    expect(gradeEvents).toContain("submission.grade");
    expect(gradeEvents).toContain("grade_change.approve");
    expect(gradeEvents).not.toContain("LOGIN_SUCCESS");

    const authEvents = eventsByCategory("auth");
    expect(authEvents).toContain("LOGIN_FAILED");
    expect(authEvents).toContain("LOGOUT");
  });

  it("label o'zbekcha qaytaradi", () => {
    expect(eventLabel("LOGIN_SUCCESS")).toBe("Tizimga kirdi");
    expect(eventLabel("grade_change.reject")).toContain("rad etildi");
  });

  it("event nomlari noyob (object kalitlari)", () => {
    const names = Object.keys(EVENTS) as EventName[];
    expect(new Set(names).size).toBe(names.length);
  });
});
