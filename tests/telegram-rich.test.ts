import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  reminderText,
  richLesson,
  splitText,
  weekParity,
  weekText,
} from "../bot/telegram.mjs";

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

const day = new Date(2026, 10, 4, 9, 0);

describe("escapeHtml", () => {
  it("maxsus belgilarni xavfsiz qiladi", () => {
    expect(escapeHtml("a & b <c> \"d\"")).toBe("a &amp; b &lt;c&gt; \"d\"");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("richLesson", () => {
  it("dars turi, xona, o'qituvchi va izohni chiqaradi", () => {
    const text = richLesson(lesson);
    expect(text).toContain("<b>1-par</b> · 09:00–10:20");
    expect(text).toContain("<b>Matematika &lt;1&gt;</b>");
    expect(text).toContain("🏷 Amaliy");
    expect(text).toContain("🚪 301 &amp; 2");
    expect(text).toContain("👨‍🏫 G. Nabiyev");
    expect(text).toContain("📝 <i>xona &lt;yangi&gt;</i>");
    expect(text).toContain("<i>🔄 O'zgartirilgan</i>");
    expect(text).not.toContain("<1>");
  });

  it("o'qituvchi jadvalida o'qituvchi nomini yashiradi", () => {
    expect(richLesson(lesson, { showTeacher: false })).not.toContain("G. Nabiyev");
  });
});

describe("reminderText", () => {
  it("talaba uchun boy karta va yig'iladigan deadline bloki", () => {
    const text = reminderText(
      { name: "Ali", role: "STUDENT", group: { name: "AI-2 & Co" } },
      day,
      [lesson],
      [{ dueAt: new Date(2026, 10, 4, 14, 0), text: "Topshiriq: <test> — Kurs" }],
      [],
      [],
    );
    expect(text).toContain("🎓 <b>Bugungi darslar</b>");
    expect(text).toContain("👥 Guruh: <b>AI-2 &amp; Co</b>");
    expect(text).toContain("Matematika &lt;1&gt;");
    expect(text).toContain("<blockquote expandable>");
    expect(text).toContain("Topshiriq: &lt;test&gt; — Kurs");
    expect(text).not.toContain("<test>");
  });

  it("o'qituvchi uchun davomat havolasini beradi", () => {
    const text = reminderText(
      { name: "T", role: "TEACHER", group: null },
      day,
      [],
      [],
      [{ entry: lesson, groupName: "AI-2", slug: "math" }],
      [],
    );
    expect(text).toContain("courses/math/attendance/lesson?date=2026-11-04&amp;slot=1");
    expect(text).toContain("🔗 Davomatni ochish");
    expect(text).toContain("👥 <b>AI-2</b>");
  });

  it("dars yo'q kunda ham toza HTML beradi", () => {
    const text = reminderText(
      { name: "Ali", role: "STUDENT", group: { name: "AI-2" } },
      new Date(2026, 10, 8, 9, 0),
      [],
      [],
      [],
      [],
    );
    expect(text).toContain("🎉 <i>Dam kuni — darslar yo'q.</i>");
    expect(text).toContain("📌 <i>Bugun deadline yo'q.</i>");
  });
});

describe("weekText", () => {
  it("kunlarni boy formatda va xavfsiz guruh nomi bilan chiqaradi", () => {
    const text = weekText("AI <2>", [lesson], 3);
    expect(text).toContain("<b>AI &lt;2&gt;</b>");
    expect(text).toContain("<b>Chorshanba</b> (bugun)");
    expect(text).toContain("🏷 Amaliy");
    expect(text).not.toContain("<2>");
  });
});

describe("splitText", () => {
  it("qisqa matnni bo'lmaydi", () => {
    expect(splitText("salom", 3800)).toEqual(["salom"]);
  });

  it("uzun matnni qatorlar bo'yicha bo'lib, blockquote'ni yopadi", () => {
    const longLines = Array.from({ length: 40 }, (_, index) => `📌 juda uzun qator ${index} ${"x".repeat(80)}`);
    const text = ["Sarlavha", "<blockquote expandable>", ...longLines, "</blockquote>"].join("\n");
    const chunks = splitText(text, 600);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      const opens = (chunk.match(/<blockquote/g) ?? []).length;
      const closes = (chunk.match(/<\/blockquote>/g) ?? []).length;
      expect(opens).toBe(closes);
      expect(chunk.length).toBeLessThanOrEqual(600);
    }
    expect(chunks.join("\n")).toContain("juda uzun qator 39");
  });
});

describe("weekParity", () => {
  it("juft va toq haftalarni ajratadi", () => {
    const monday = new Date(2026, 10, 2);
    const nextMonday = new Date(2026, 10, 9);
    expect(["odd", "even"]).toContain(weekParity(monday));
    expect(weekParity(nextMonday)).not.toBe(weekParity(monday));
  });
});
