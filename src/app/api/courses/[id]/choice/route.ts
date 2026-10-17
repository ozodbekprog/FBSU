import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { canManageCourse } from "@/components/courses/course-access";
import { recordEvent } from "@/modules/events/record";

const createSchema = z.object({
  question: z.string().trim().min(1).max(500),
  options: z
    .array(z.string().trim().min(1).max(200))
    .min(2)
    .max(10),
  isMultiple: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
});

function readOptions(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function findCourse(id: string) {
  return prisma.course.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, teacherId: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const course = await findCourse(id);
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }

  const canManage = canManageCourse(user, course);
  if (!canManage) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id, userId: user.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!enrollment) {
      return Response.json(
        { ok: false, error: "So'rovnomalarni ko'rish uchun ruxsat yo'q" },
        { status: 403 },
      );
    }
  }

  const polls = await prisma.choicePoll.findMany({
    where: { courseId: course.id },
    orderBy: { createdAt: "desc" },
    include: { votes: true },
  });

  const isStudent = user.role === "STUDENT";

  const data = polls.map((poll) => {
    const options = readOptions(poll.options);
    const counts = options.map(
      (_option, index) => poll.votes.filter((vote) => vote.optionIndex === index).length,
    );
    const myVotes = isStudent
      ? poll.votes
          .filter((vote) => vote.studentId === user.id)
          .map((vote) => vote.optionIndex)
          .sort((a, b) => a - b)
      : [];

    return {
      id: poll.id,
      question: poll.question,
      options,
      isMultiple: poll.isMultiple,
      isAnonymous: poll.isAnonymous,
      createdAt: poll.createdAt,
      counts,
      totalVotes: poll.votes.length,
      myVotes,
      canManage,
    };
  });

  return Response.json({ ok: true, data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const course = await findCourse(id);
  if (!course) {
    return Response.json({ ok: false, error: "Kurs topilmadi" }, { status: 404 });
  }

  if (!canManageCourse(user, course)) {
    return Response.json(
      { ok: false, error: "So'rovnoma yaratish uchun ruxsat yo'q" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Ma'lumotlar noto'g'ri (savol va 2-10 ta variant kiritilishi shart)",
      },
      { status: 400 },
    );
  }

  const options = Array.from(new Set(parsed.data.options.map((option) => option.trim())));
  if (options.length < 2) {
    return Response.json(
      { ok: false, error: "Kamida 2 ta turli variant kiritilishi shart" },
      { status: 400 },
    );
  }

  const created = await prisma.choicePoll.create({
    data: {
      courseId: course.id,
      question: parsed.data.question.trim(),
      options: options as Prisma.InputJsonValue,
      isMultiple: parsed.data.isMultiple ?? false,
      isAnonymous: parsed.data.isAnonymous ?? false,
    },
  });

  await recordEvent(user.id, "choice.create", {
    entity: "ChoicePoll",
    entityId: created.id,
    meta: { courseId: course.id, question: created.question },
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}
