import { z } from "zod";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quizUpdateSchema } from "@/components/quiz/schema";
import { publicError } from "@/components/quiz/server";
import { toQuestionFull, toQuestionPublic } from "@/components/quiz/shared";
import { notifyCourseStudents } from "@/server/notify";
import { hasCapability } from "@/modules/capabilities";
import { normalizeSubnet } from "@/modules/quiz/access-rules";

const dueAtSchema = z.string().trim().min(1).nullable().optional();

const updateSchema = quizUpdateSchema.extend({ dueAt: dueAtSchema });

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

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, slug: true, teacherId: true } },
      questions: { orderBy: { position: "asc" } },
    },
  });
  if (!quiz) return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });

  const staff = hasCapability(user.role, "quiz.manage");
  const questions = quiz.questions.map(toQuestionFull);

  if (staff) {
    if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    return Response.json({ ok: true, data: { ...publicQuiz(quiz), questions } });
  }

  if (!quiz.isPublished) return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: quiz.courseId, userId: user.id } },
    select: { status: true },
  });
  if (enrollment?.status !== "ACTIVE") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: id, studentId: user.id },
    orderBy: { startedAt: "desc" },
    select: { id: true, startedAt: true, finishedAt: true, score: true },
  });
  return Response.json({
    ok: true,
    data: { ...publicQuiz(quiz), questions: questions.map(toQuestionPublic), attempts },
  });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "quiz.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
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
    const quiz = await prisma.quiz.findUnique({ where: { id }, include: { course: true } });
    if (!quiz) return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });
    if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const data = parsed.data;
    if (data.courseId && data.courseId !== quiz.courseId) {
      const course = await prisma.course.findUnique({ where: { id: data.courseId } });
      if (!course) return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
      if (user.role === "TEACHER" && course.teacherId !== user.id) {
        return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const { dueAt: dueAtValue, password, ipSubnet: ipSubnetValue, ...rest } = data;
    const quizPassword =
      password === undefined ? undefined : password.length > 0 ? await bcrypt.hash(password, 12) : null;
    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        ...rest,
        ...(quizPassword !== undefined ? { quizPassword } : {}),
        ...(ipSubnetValue !== undefined ? { ipSubnet: subnet.value } : {}),
        ...(dueAtValue !== undefined ? { dueAt: due.date } : {}),
      },
    });
    if (data.isPublished === true && !quiz.isPublished) {
      try {
        await notifyCourseStudents(updated.courseId, {
          title: `Yangi test: ${updated.title}`,
          link: `/quizzes/${updated.id}`,
        });
      } catch {}
    }
    return Response.json({ ok: true, data: { id: updated.id } });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "quiz.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id }, include: { course: true } });
    if (!quiz) return Response.json({ ok: false, error: "Test topilmadi" }, { status: 404 });
    if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    await prisma.quiz.delete({ where: { id } });
    return Response.json({ ok: true, data: { id } });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}
