import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { openboardDataSchema } from "@/lib/openboard/types";
import { sanitizeHtml } from "@/lib/openboard/sanitize";

const MAX_BYTES = 1_500_000;

const putSchema = z.object({
  assignmentId: z.string().trim().min(1).nullable().optional(),
  data: z.unknown(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const raw = new URL(request.url).searchParams.get("assignmentId");
  const assignmentId = raw && raw.length > 0 ? raw : null;
  if (assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });
    if (!assignment) {
      return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
    }
  }
  const board = await prisma.board.findFirst({
    where: { userId: user.id, assignmentId },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({
    ok: true,
    data: { data: board?.data ?? null, updatedAt: board?.updatedAt ?? null },
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
  const assignmentId = parsed.data.assignmentId ?? null;
  if (assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });
    if (!assignment) {
      return Response.json({ ok: false, error: "Topshiriq topilmadi" }, { status: 404 });
    }
  }
  const rawData: unknown = parsed.data.data ?? {};
  const openboardParsed = openboardDataSchema.safeParse(rawData);
  const boardData = (
    openboardParsed.success
      ? {
          ...openboardParsed.data,
          notes: openboardParsed.data.notes.map((note) => ({
            ...note,
            blocks: note.blocks.map((block) => {
              if (block.type === "text") {
                return { ...block, html: sanitizeHtml(block.html) };
              }
              if (block.type === "heading") {
                return { ...block, html: sanitizeHtml(block.html) };
              }
              return block;
            }),
          })),
        }
      : rawData
  ) as Prisma.InputJsonValue;
  const serialized = JSON.stringify(boardData);
  if (serialized.length > MAX_BYTES) {
    return Response.json({ ok: false, error: "Doska ma'lumotlari juda katta" }, { status: 413 });
  }

  const existing = await prisma.board.findFirst({
    where: { userId: user.id, assignmentId },
  });
  const board = existing
    ? await prisma.board.update({ where: { id: existing.id }, data: { data: boardData } })
    : await prisma.board.create({
        data: { userId: user.id, assignmentId, data: boardData },
      });

  return Response.json({ ok: true, data: { updatedAt: board.updatedAt } });
}
