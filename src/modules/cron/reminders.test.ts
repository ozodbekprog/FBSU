import { describe, expect, it } from "vitest";
import { collectDueSoonReminders, type ReminderCandidate } from "./reminders";

const NOW = new Date("2026-10-17T09:00:00.000Z");

function candidate(assignmentId: string, dueAt: Date): ReminderCandidate {
  return { assignmentId, dueAt, title: `Topshiriq ${assignmentId}`, courseSlug: "ai2-26" };
}

describe("collectDueSoonReminders", () => {
  it("24 soat ichida tugaydiganlarini tanlaydi", () => {
    const soon = candidate("soon", new Date(NOW.getTime() + 3600 * 1000));
    const result = collectDueSoonReminders([soon], { hours: 24, now: NOW });
    expect(result.map((item) => item.assignmentId)).toEqual(["soon"]);
  });

  it("o'tib ketgan muddatlarni chiqarib tashlaydi", () => {
    const expired = candidate("expired", new Date(NOW.getTime() - 1000));
    const result = collectDueSoonReminders([expired], { hours: 24, now: NOW });
    expect(result).toEqual([]);
  });

  it("aynan hozirgi vaqtdagi muddatni chiqarib tashlaydi", () => {
    const exact = candidate("exact", new Date(NOW.getTime()));
    expect(collectDueSoonReminders([exact], { hours: 24, now: NOW })).toEqual([]);
  });

  it("oyna chegarasidan keyingi muddatlarni chiqarib tashlaydi", () => {
    const inside = candidate("inside", new Date(NOW.getTime() + 24 * 3600 * 1000));
    const outside = candidate("outside", new Date(NOW.getTime() + 24 * 3600 * 1000 + 1));
    const result = collectDueSoonReminders([inside, outside], { hours: 24, now: NOW });
    expect(result.map((item) => item.assignmentId)).toEqual(["inside"]);
  });

  it("natijani dueAt bo'yicha o'sish tartibida qaytaradi", () => {
    const later = candidate("later", new Date(NOW.getTime() + 20 * 3600 * 1000));
    const earlier = candidate("earlier", new Date(NOW.getTime() + 2 * 3600 * 1000));
    const middle = candidate("middle", new Date(NOW.getTime() + 8 * 3600 * 1000));
    const result = collectDueSoonReminders([later, earlier, middle], { hours: 24, now: NOW });
    expect(result.map((item) => item.assignmentId)).toEqual(["earlier", "middle", "later"]);
  });

  it("soat oynasini hours bo'yicha hisoblaydi", () => {
    const twoHours = candidate("two", new Date(NOW.getTime() + 2 * 3600 * 1000));
    expect(collectDueSoonReminders([twoHours], { hours: 1, now: NOW })).toEqual([]);
    expect(collectDueSoonReminders([twoHours], { hours: 3, now: NOW })).toHaveLength(1);
  });

  it("bo'sh ro'yxat uchun bo'sh natija qaytaradi", () => {
    expect(collectDueSoonReminders([], { hours: 24, now: NOW })).toEqual([]);
  });
});
