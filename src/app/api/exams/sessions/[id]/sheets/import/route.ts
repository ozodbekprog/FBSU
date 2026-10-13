import { z } from "zod";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { askAi } from "@/lib/ai";
import { canManageSession } from "@/components/exams/session-data";
import { matchStudents, parseNameList, type EnrolledStudent } from "@/components/exams/sheet-import";

/**
 * Imtihon sessiyasiga talabalar ro'yxatini import qilish.
 *
 * Ikki rejim:
 *   - `text` — oddiy import: foydalanuvchi matn/CSV joylashtiradi, biz
 *     qatorlarni ajratamiz.
 *   - `ai` — AI import: tartibsiz matn (chatdan ko'chirilgan, ortiqcha
 *     so'zlar bilan) LLM orqali tozalanadi va faqat ismlar qoladi.
 *
 * Ikkala rejim ham bir xil qiyoslashdan o'tadi (`matchStudents`) va
 * standart oqim bilan bir xil `ExamSheet` yozuvlarini yaratadi.
 *
 * `preview: true` — hech narsa yozmasdan natijani qaytaradi (foydalanuvchi
 * avval ko'rib tasdiqlaydi).
 */

const importSchema = z.object({
  mode: z.enum(["text", "ai"]),
  text: z.string().min(1, "Matn bo'sh").max(20000, "Matn juda uzun"),
  /** `preview` — faqat ko'rsatish, bazaga yozmaslik */
  preview: z.boolean().optional(),
  /** Qo'lda tanlangan talabalar (noaniq mos kelishlar uchun) */
  selectedIds: z.array(z.string()).optional(),
});

async function findSessionForStaff(id: string) {
  return prisma.examSession.findUnique({
    where: { id },
    select: { id: true, courseId: true, course: { select: { teacherId: true } } },
  });
}

/**
 * LLM orqali matndan ismlarni ajratadi.
 *
 * Model erkin matn qaytarishi mumkin, shuning uchun javobni qat'iy
 * tekshiramiz: faqat ismga o'xshash qatorlarni olamiz, raqamlash va
 * izohlarni olib tashlaymiz.
 */
async function extractNamesWithAi(text: string): Promise<{ names: string; usedAi: boolean }> {
  const answer = await askAi(
    [
      {
        role: "system",
        content: [
          "Sen ro'yxatdan ismlarni ajratuvchi yordamchisan.",
          "Vazifa: foydalanuvchi bergan matndan FAQAT odam ismlarini ajratib ol.",
          "Qoidalar:",
          "- Har bir ismni alohida qatorga yoz.",
          "- Raqamlash, izohlar, guruh nomlari, sanalar va ortiqcha so'zlarni OLIB TASHLA.",
          "- Ismni o'zgartirmang, faqat tozalang.",
          "- Javobda boshqa hech narsa yozmang — faqat ismlar ro'yxati.",
        ].join("\n"),
      },
      { role: "user", content: text },
    ],
    { timeoutMs: 25000, maxTokens: 1200 },
  );

  if (!answer) return { names: text, usedAi: false };

  // Model ba'zan raqamlash yoki nuqta qo'shib yuboradi — tozalaymiz.
  const cleaned = answer
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+\s*[.)\]:-]|[-•*])\s*/, "").trim())
    .filter((line) => line && !/^[:\-—]+$/.test(line))
    .join("\n");

  return { names: cleaned || text, usedAi: true };
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!isStaff(user.role)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const session = await findSessionForStaff(id);
  if (!session) return Response.json({ ok: false, error: "Sessiya topilmadi" }, { status: 404 });
  if (!canManageSession({ id: user.id, role: user.role }, session.course.teacherId)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  // 1) Matnni ismlar ro'yxatiga aylantiramiz
  const source = parsed.data.mode === "ai"
    ? await extractNamesWithAi(parsed.data.text)
    : { names: parsed.data.text, usedAi: false };

  // AI javob bermasa (kalit yo'q / xatolik) — oddiy ajratishga qaytamiz,
  // foydalanuvchi hech narsa yo'qotmaydi.
  const rows = parseNameList(source.names);
  if (rows.length === 0) {
    return Response.json({ ok: false, error: "Ro'yxatda ism topilmadi" }, { status: 400 });
  }

  // 2) Kursga yozilgan talabalar bilan qiyoslaymiz
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: session.courseId },
    select: { user: { select: { id: true, name: true } } },
  });
  const enrolled: EnrolledStudent[] = enrollments.map((e) => ({ id: e.user.id, name: e.user.name }));

  const result = matchStudents(rows, enrolled);

  // 3) Preview — hech narsa yozmaymiz
  if (parsed.data.preview) {
    const existing = await prisma.examSheet.findMany({
      where: { sessionId: id },
      select: { studentId: true },
    });
    const alreadyAdded = new Set(existing.map((s) => s.studentId));
    return Response.json({
      ok: true,
      data: {
        parsed: rows.length,
        usedAi: source.usedAi,
        matched: result.matched.map((m) => ({ ...m, alreadyAdded: alreadyAdded.has(m.studentId) })),
        unmatched: result.unmatched,
        ambiguous: result.ambiguous,
        enrolledCount: enrolled.length,
      },
    });
  }

  // 4) Yozamiz — mos kelganlar + qo'lda tanlanganlar
  const selected = new Set(parsed.data.selectedIds ?? []);
  const targets = [
    ...result.matched.map((m) => ({ studentId: m.studentId, seat: m.seat })),
    ...result.ambiguous
      .flatMap((a) => a.candidates)
      .filter((c) => selected.has(c.id))
      .map((c) => ({ studentId: c.id, seat: undefined as string | undefined })),
  ];

  const existing = await prisma.examSheet.findMany({
    where: { sessionId: id },
    select: { studentId: true },
  });
  const alreadyAdded = new Set(existing.map((s) => s.studentId));

  const toCreate = targets.filter((t) => !alreadyAdded.has(t.studentId));

  try {
    if (toCreate.length > 0) {
      await prisma.examSheet.createMany({
        data: toCreate.map((t) => ({
          sessionId: id,
          studentId: t.studentId,
          seat: t.seat ?? null,
        })),
        skipDuplicates: true,
      });
    }
    return Response.json({
      ok: true,
      data: {
        created: toCreate.length,
        skipped: targets.length - toCreate.length,
        unmatched: result.unmatched.length,
        ambiguous: result.ambiguous.length,
        usedAi: source.usedAi,
      },
    });
  } catch {
    return Response.json({ ok: false, error: "Ro'yxatni saqlashda xatolik" }, { status: 500 });
  }
}
