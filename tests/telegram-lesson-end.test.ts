import { describe, expect, it } from "vitest";
import {
  activeLessonSlot,
  lessonAlertText,
  minutesUntilSlotEnd,
  slotEndMinutes,
} from "@/server/telegram/lesson-end";

const now = {
  jsDay: 3,
  dow: 3,
  hour: 12,
  minute: 10,
  title: "Chorshanba",
  dateLabel: "09.11.2026",
  iso: "2026-11-09",
};

const current = {
  slot: 3,
  subject: "Matematika <1>",
  room: "305 & 2",
  teacher: "G. Nabiyev",
  status: "NORMAL",
  groupName: "AI2-26",
};

const next = {
  slot: 4,
  subject: "Fizika",
  room: "210",
  teacher: "A. Karimov",
  status: "CHANGED",
  groupName: "AI2-26",
};

describe("lesson end: vaqt oynasi", () => {
  it("par tugash vaqtini daqiqada qaytaradi", () => {
    expect(slotEndMinutes(1)).toBe(620);
    expect(slotEndMinutes(8)).toBe(1300);
    expect(slotEndMinutes(99)).toBeNull();
  });

  it("tugashdan 10 daqiqa oldin va keyin 15 daqiqa ichida faol", () => {
    expect(activeLessonSlot(610)).toBe(1);
    expect(activeLessonSlot(620)).toBe(1);
    expect(activeLessonSlot(635)).toBe(1);
    expect(activeLessonSlot(636)).toBeNull();
    expect(activeLessonSlot(540)).toBeNull();
  });

  it("keyingi par oynasi bilan kesishmaydi", () => {
    expect(activeLessonSlot(700)).toBe(2);
    expect(activeLessonSlot(725)).toBe(2);
    expect(activeLessonSlot(726)).toBeNull();
  });

  it("tugashiga qolgan daqiqani hisoblaydi", () => {
    expect(minutesUntilSlotEnd(1, 610)).toBe(10);
    expect(minutesUntilSlotEnd(1, 625)).toBe(-5);
  });
});

describe("lesson end: xabar matni", () => {
  it("talabaga tugash vaqti va keyingi darslarni ko'rsatadi", () => {
    const text = lessonAlertText({
      role: "STUDENT",
      groupName: "AI2-26",
      slot: 3,
      minutesLeft: 10,
      now,
      current: [current],
      next: [next],
    });
    expect(text).toContain("⏰ <b>Dars tugashiga 10 daqiqa qoldi</b>");
    expect(text).toContain("👥 Guruh: <b>AI2-26</b>");
    expect(text).toContain("<b>Matematika &lt;1&gt;</b>");
    expect(text).toContain("📌 <b>Keyingi darslar</b>");
    expect(text).toContain("<b>Fizika</b>");
    expect(text).toContain("🔄 O'zgartirilgan");
    expect(text).not.toContain("<1>");
  });

  it("dars tugagan bo'lsa tugadi deb yozadi", () => {
    const text = lessonAlertText({
      role: "STUDENT",
      groupName: "AI2-26",
      slot: 3,
      minutesLeft: 0,
      now,
      current: [current],
      next: [],
    });
    expect(text).toContain("✅ <b>Dars tugadi</b>");
    expect(text).toContain("🎉 <i>Bugun boshqa darslar yo'q.</i>");
  });

  it("o'qituvchiga guruh va davomat havolasini qo'shadi", () => {
    const text = lessonAlertText({
      role: "TEACHER",
      slot: 3,
      minutesLeft: 5,
      now,
      current: [{ ...current, slug: "matematika" }],
      next: [{ ...next, slug: "fizika" }],
    });
    expect(text).toContain("👥 <b>AI2-26</b>");
    expect(text).toContain("🔗 Davomatni ochish");
    expect(text).not.toContain("👥 Guruh: <b>AI2-26</b>");
  });
});
