import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { recordEvent } from "@/modules/events/record";

const voteSchema = z.object({
  optionIndexes: z.array(z.number().int().nonnegative()).min(1).max(10),
});

function readOptions(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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
  const poll = await prisma.choicePoll.findUnique({
    where: { id },
    select: {
      id: true,
      courseId: true,
      options: true,
      isMultiple: true,
    },
  });
  if (!poll) {
    return Response.json({ ok: false, error: "So'rovnoma topilmadi" }, { status: 404 });
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId: poll.courseId, userId: user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) {
    return Response.json(
      { ok: false, error: "Ovoz berish uchun kursga yozilgan bo'lishingiz kerak" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ovoz ma'lumotlari noto'g'ri" }, { status: 400 });
  }

  const options = readOptions(poll.options);
  const indexes = Array.from(new Set(parsed.data.optionIndexes));

  if (!poll.isMultiple && indexes.length !== 1) {
    return Response.json(
      { ok: false, error: "Bu so'rovnomada faqat bitta variant tanlanadi" },
      { status: 400 },
    );
  }
  if (indexes.some((index) => index < 0 || index >= options.length)) {
    return Response.json({ ok: false, error: "Variant indeksi noto'g'ri" }, { status: 400 });
  }

  await prisma.choiceVote.deleteMany({ where: { pollId: poll.id, studentId: user.id } });
  await prisma.choiceVote.createMany({
    data: indexes.map((optionIndex) => ({
      pollId: poll.id,
      studentId: user.id,
      optionIndex,
    })),
    skipDuplicates: true,
  });

  await recordEvent(user.id, "choice.vote", {
    entity: "ChoicePoll",
    entityId: poll.id,
    meta: { courseId: poll.courseId, count: indexes.length },
  });

  return Response.json({ ok: true, data: { voted: true } });
}
