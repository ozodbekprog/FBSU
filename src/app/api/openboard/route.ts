import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { openboardDataSchema, OPENBOARD_LIMITS } from "@/lib/openboard/types";
import { payloadBytes } from "@/lib/openboard/store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const board = await prisma.board.findFirst({
    where: { userId: user.id, assignmentId: null },
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
  const payload = (await request.json().catch(() => null)) as { data?: unknown } | null;
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
  const parsed = openboardDataSchema.safeParse(payload.data);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
  const boardData = parsed.data as unknown as Prisma.InputJsonValue;
  if (payloadBytes(boardData) > OPENBOARD_LIMITS.maxPayloadBytes) {
    return Response.json({ ok: false, error: "Dosha ma'lumotlari juda katta" }, { status: 413 });
  }

  const existing = await prisma.board.findFirst({
    where: { userId: user.id, assignmentId: null },
  });
  const board = existing
    ? await prisma.board.update({ where: { id: existing.id }, data: { data: boardData } })
    : await prisma.board.create({
        data: { userId: user.id, assignmentId: null, data: boardData },
      });

  return Response.json({ ok: true, data: { updatedAt: board.updatedAt } });
}
