import { z } from "zod";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quizCreateSchema } from "@/components/quiz/schema";
import { publicError } from "@/components/quiz/server";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { normalizeSubnet } from "@/modules/quiz/access-rules";

const dueAtSchema = z.string().trim().min(1).nullable().optional();

const createSchema = quizCreateSchema.extend({ dueAt: dueAtSchema });

function publicQuiz<T extends { quizPassword: string | null }>(quiz: T) {
  const { quizPassword, ...rest } = quiz;
  return { ...rest, hasPassword: quizPassword !== null };
}

function parseSubnet(value: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === undefined || value.trim() === "") return { ok: true, value: null };
  const normalized = normalizeSubnet(value);
  if (!normalized) return { ok: false };
  return { ok: true, value: normalized };
}


function parseDueAt(value: string | null | undefined) {
  if (!value) return { ok: true as const, date: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false as const, date: null };
  return { ok: true as const, date };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? undefined;

  try {
    if (user.role === "STUDENT") {
      const quizzes = await prisma.quiz.findMany({
        where: {
          isPublished: true,
          ...(courseId ? { courseId } : {}),
          course: { enrollments: { some: { userId: user.id } } },
        },
        orderBy: { createdAt: "desc" },
        include: {
          course: { select: { id: true, title: true, slug: true } },
          _count: { select: { questions: true } },
          attempts: {
            where: { studentId: user.id },
            select: { id: true, startedAt: true, finishedAt: true, score: true },
            orderBy: { startedAt: "desc" },
          },
        },
      });
      return Response.json({ ok: true, data: quizzes.map(publicQuiz) });
    }

    if (!hasCapability(user.role, "quiz.manage")) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId,
        ...(user.role === "TEACHER" ? { course: { teacherId: user.id } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    return Response.json({ ok: true, data: quizzes.map(publicQuiz) });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "quiz.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" },
      { status: 400 },
    );
  }

  const due = parseDueAt(parsed.data.dueAt);
  if (!due.ok) {
    return Response.json({ ok: false, error: "Muddat sanasi noto'g'ri" }, { status: 400 });
  }

  const subnet = parseSubnet(parsed.data.ipSubnet);
  if (!subnet.ok) {
    return Response.json({ ok: false, error: "IP subnet formati xato" }, { status: 400 });
  }

  try {
    const course = await prisma.course.findUnique({ where: { id: parsed.data.courseId } });
    if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
    if (user.role === "TEACHER" && course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { questions, password, ...meta } = parsed.data;
    const quizPassword =
      password && password.length > 0 ? await bcrypt.hash(password, 12) : null;
    const quiz = await prisma.quiz.create({
      data: {
        courseId: meta.courseId,
        title: meta.title,
        description: meta.description,
        dueAt: due.date,
        timeLimitMin: meta.timeLimitMin,
        maxAttempts: meta.maxAttempts,
        isPublished: meta.isPublished,
        quizPassword,
        ipSubnet: subnet.value,
        questions:
          questions && questions.length > 0
            ? {
                create: questions.map((question, index) => ({
                  text: question.text,
                  type: question.type,
                  options: question.options,
                  correct: question.correct,
                  points: question.points,
                  position: index + 1,
                })),
              }
            : undefined,
      },
    });
    return Response.json({ ok: true, data: { id: quiz.id } }, { status: 201 });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
