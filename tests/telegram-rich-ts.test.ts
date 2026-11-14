import { describe, expect, it } from "vitest";
import {
  dailyReminderText,
  escapeHtml,
  formatDateUz,
  matchCourseSlug,
  richLesson,
  splitText,
  weekParity,
  weekText,
} from "../src/server/telegram/rich";

const lesson = {
  dayOfWeek: 3,
  slot: 1,
  subject: "Matematika <1>",
  room: "301 & 2",
  teacher: "G. Nabiyev",
  lessonType: "Amaliy",
  status: "CHANGED",
  note: "xona <yangi>",
};

const day = new Date("2026-11-04T09:00:00+05:00");

describe("rich helpers", () => {
  it("HTML belgilarini xavfsiz qiladi", () => {
    expect(escapeHtml("a & b <c>")).toBe("a &amp; b &lt;c&gt;");
    expect(escapeHtml(null)).toBe("");
  });

  it("dars kartasini to'liq chiqaradi", () => {
    const text = richLesson(lesson);
    expect(text).toContain("<b>1-par</b> · 09:00–10:20");
    expect(text).toContain("<b>Matematika &lt;1&gt;</b>");
    expect(text).toContain("🏷 Amaliy");
    expect(text).toContain("🚪 301 &amp; 2");
    expect(text).toContain("👨‍🏫 G. Nabiyev");
    expect(text).toContain("🔄 O'zgartirilgan");
    expect(text).not.toContain("<1>");
  });

  it("uzun matnni blockquote'ni yopib bo'ladi", () => {
    const lines = Array.from({ length: 30 }, (_, index) => `📌 qator ${index} ${"x".repeat(80)}`);
    const text = ["Sarlavha", "<blockquote expandable>", ...lines, "</blockquote>"].join("\n");
    const chunks = splitText(text, 500);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      const opens = (chunk.match(/<blockquote/g) ?? []).length;
      const closes = (chunk.match(/<\/blockquote>/g) ?? []).length;
      expect(opens).toBe(closes);
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });

  it("juft va toq haftani ajratadi", () => {
    expect(weekParity(new Date("2026-10-26T12:00:00+05:00"))).not.toBe(
      weekParity(new Date("2026-11-02T12:00:00+05:00")),
    );
  });

  it("kurs slug'ini fan nomidan topadi", () => {
    const courses = [
      { title: "Matematika 1", slug: "math" },
      { title: "Programming", slug: "programming" },
    ];
    expect(matchCourseSlug("Matematika", courses)).toBe("math");
    expect(matchCourseSlug("Programming", courses)).toBe("programming");
    expect(matchCourseSlug("Fizika", courses)).toBeNull();
  });
});

describe("dailyReminderText", () => {
  it("talaba uchun boy karta, imtihon va deadline blokini beradi", () => {
    const text = dailyReminderText(
      { name: "Ali", role: "STUDENT", group: { name: "AI-2 & Co" } },
      day,
      [lesson],
      [{ dueAt: new Date("2026-11-04T14:00:00+05:00"), text: "Topshiriq: <test> — Kurs" }],
      [],
      [{ course: "Math", title: "Oraliq", room: "102", time: "10:30–11:50", seat: "4", permitted: true }],
      "https://example.test",
    );
    expect(text).toContain("🎓 <b>Bugungi darslar</b>");
    expect(text).toContain("👥 Guruh: <b>AI-2 &amp; Co</b>");
    expect(text).toContain("Matematika &lt;1&gt;");
    expect(text).toContain("<blockquote expandable>");
    expect(text).toContain("Topshiriq: &lt;test&gt; — Kurs");
    expect(text).toContain("✅ <i>Ruxsat bor</i>");
    expect(text).not.toContain("<test>");
  });

  it("o'qituvchi uchun davomat havolasini beradi", () => {
    const text = dailyReminderText(
      { name: "T", role: "TEACHER", group: null },
      day,
      [],
      [],
      [{ entry: lesson, groupName: "AI-2", slug: "math" }],
      [],
      "https://fbsu.vercel.app",
    );
    expect(text).toContain("https://fbsu.vercel.app/courses/math/attendance/lesson?date=2026-11-04&amp;slot=1");
    expect(text).toContain("🔗 Davomatni ochish");
    expect(text).toContain("👥 <b>AI-2</b>");
  });

  it("dam kuni uchun toza matn beradi", () => {
    const text = dailyReminderText(
      { name: "Ali", role: "STUDENT", group: { name: "AI-2" } },
      new Date("2026-11-08T09:00:00+05:00"),
      [],
      [],
      [],
      [],
      "https://example.test",
    );
    expect(text).toContain("🎉 <i>Dam kuni — darslar yo'q.</i>");
    expect(text).toContain("📌 <i>Bugun deadline yo'q.</i>");
  });
});

describe("weekText", () => {
  it("haftalik jadvalni kun sarlavhalari bilan beradi", () => {
    const text = weekText("AI <2>", [lesson], 3);
    expect(text).toContain("<b>AI &lt;2&gt;</b>");
    expect(text).toContain("<b>Chorshanba</b> (bugun)");
    expect(text).toContain("🏷 Amaliy");
    expect(text).not.toContain("<2>");
  });

  it("sanani Toshkent vaqtida formatlaydi", () => {
    expect(formatDateUz(new Date("2026-11-04T20:30:00Z"))).toBe("05.11.2026");
  });
});
