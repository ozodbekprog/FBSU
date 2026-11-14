import { describe, expect, it } from "vitest";
import {
  capNoticeLines,
  scheduleChangeDetails,
  scheduleLine,
} from "@/server/telegram/schedule-notify";

describe("schedule notify: qator formati", () => {
  it("kun, par, fan, xona va holatni chiqaradi", () => {
    const line = scheduleLine({
      action: "updated",
      dayOfWeek: 1,
      slot: 2,
      subject: "Matematika <1>",
      room: "305 & 2",
      groupName: "AI-2 & Co",
      status: "CHANGED",
      note: "yangi <xona>",
      detail: "Xona: 305 → 310",
    });
    expect(line).toContain("<b>Dushanba</b> · 2-par · 10:30–11:50");
    expect(line).toContain("<b>Matematika &lt;1&gt;</b>");
    expect(line).toContain("🚪 305 &amp; 2");
    expect(line).toContain("👥 AI-2 &amp; Co");
    expect(line).toContain("<i>🔄 O'zgartirilgan</i>");
    expect(line).toContain("Xona: 305 → 310");
    expect(line).toContain("🔄 O'zgartirildi");
    expect(line).toContain("<i>yangi &lt;xona&gt;</i>");
    expect(line).not.toContain("<1>");
  });

  it("o'chirilgan dars uchun olib tashlandi yorlig'ini beradi", () => {
    const line = scheduleLine({
      action: "removed",
      dayOfWeek: 5,
      slot: 1,
      subject: "Fizika",
      groupName: "AI2-26",
    });
    expect(line).toContain("🗑 Jadvaldan olib tashlandi");
    expect(line).toContain("<b>Juma</b>");
  });
});

describe("schedule notify: o'zgarish tafsilotlari", () => {
  const before = {
    dayOfWeek: 1,
    slot: 2,
    subject: "Matematika",
    room: "305",
    teacher: "G. Nabiyev",
    status: "NORMAL",
    note: null,
  };
  const after = {
    dayOfWeek: 2,
    slot: 3,
    subject: "Matematika",
    room: "310",
    teacher: "A. Karimov",
    status: "MOVED",
    note: "yangi vaqt",
  };

  it("kun, par, xona, o'qituvchi, holat va izohni solishtiradi", () => {
    const details = scheduleChangeDetails(before, after);
    expect(details).toContain("Kun: Dushanba → Seshanba");
    expect(details).toContain("Par: 2 → 3");
    expect(details).toContain("Xona: 305 → 310");
    expect(details).toContain("O'qituvchi: G. Nabiyev → A. Karimov");
    expect(details).toContain("Holat: Oddiy → ➡️ Ko'chirilgan");
    expect(details).toContain("Izoh: — → yangi vaqt");
  });

  it("o'zgarish bo'lmasa bo'sh ro'yxat qaytaradi", () => {
    expect(scheduleChangeDetails(before, before)).toEqual([]);
  });
});

describe("schedule notify: qatorlar chegarasi", () => {
  it("ko'p o'zgarishlarni qisqartiradi", () => {
    const lines = Array.from({ length: 20 }, (_, index) => `line-${index}`);
    const capped = capNoticeLines(lines, 15);
    expect(capped).toHaveLength(16);
    expect(capped.at(-1)).toContain("yana 5 ta");
  });
});
