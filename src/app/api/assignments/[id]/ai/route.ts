import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { askAi } from "@/lib/ai";
import { canGradeCourse } from "@/components/courses/course-access";
import { fmtDateTime } from "@/lib/utils";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1500),
      }),
    )
    .min(1)
    .max(10),
});

const FALLBACK_REPLY =
  "Hozir javob bera olmadim. Birozdan so'ng qayta yozing yoki savolni o'qituvchingizga bering.";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!assignment) {
    return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
  }

  const management = canGradeCourse(user, assignment.course);
  let submissionStatus: string | null = null;

  if (!management) {
    if (user.role !== "STUDENT") {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const enrolled = await prisma.enrollment.findUnique({
      where: {
        courseId_userId: { courseId: assignment.courseId, userId: user.id },
        status: "ACTIVE",
      },
    });
    if (!enrolled) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const submission = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: id, studentId: user.id } },
    });
    if (submission?.status === "GRADED") {
      submissionStatus = `baholangan (${submission.score ?? 0}/${assignment.maxScore} ball)`;
    } else if (submission) {
      submissionStatus = "topshirilgan, baho kutilmoqda";
    } else {
      submissionStatus = "hali topshirilmagan";
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Xabar formati noto'g'ri" }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(`ai:${user.id}`, {
    windowMs: 60 * 60 * 1000,
    maxAttempts: 60,
    keyPrefix: "ai",
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p murojaat. Birozdan so'ng urinib ko'ring." },
      { status: 429 },
    );
  }

  const contextLines = [
    `Kurs: ${assignment.course.title}`,
    `Topshiriq: ${assignment.title}`,
    assignment.dueAt
      ? `Muddat: ${fmtDateTime(assignment.dueAt)}`
      : "Muddat: belgilanmagan",
    `Maksimal ball: ${assignment.maxScore}`,
    `Topshiriq sharti: ${assignment.description ?? "tavsif kiritilmagan"}`,
  ];
  if (submissionStatus) {
    contextLines.push(`Talabaning holati: ${submissionStatus}`);
  }

  const reply = await askAi(
    [
      {
        role: "system",
        content:
          "Sen \"FBSU\" saytidagi topshiriq bo'yicha AI konsultantsan.\n" +
          `Foydalanuvchi: ${user.name} (${user.role === "STUDENT" ? "talaba" : "o'qituvchi"}).\n\n` +
          `TOPSHIRIQ MA'LUMOTLARI:\n${contextLines.join("\n")}\n\n` +
          "Qoidalar:\n" +
          "- O'zbek tilida, qisqa (2-5 gap), samimiy va aniq yoz.\n" +
          "- Topshiriqni tushuntir, qanday bajarishni qadam-baqadam ayt, reja yoki g'oyalar taklif qil.\n" +
          "- Tayyor javobni to'liq yozib berma — talabani o'rgatishga yordam ber, misol va yo'nalish ber.\n" +
          "- Faqat shu topshiriq va o'quv jarayoni haqida gapir; boshqa mavzular, boshqa odamlarning ma'lumotlari yoki texnik tafsilotlarga o'tma.\n" +
          "- Aniq bilmasang — taxmin qilma, o'qituvchiga murojaat qilishni tavsiya qil.",
      },
      ...parsed.data.messages,
    ],
    { maxTokens: 500, timeoutMs: 25000 },
  );

  if (!reply) {
    return Response.json({ ok: true, data: { reply: FALLBACK_REPLY, fallback: true } });
  }

  return Response.json({ ok: true, data: { reply } });
}
