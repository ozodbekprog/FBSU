import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  author: z.string().trim().min(1).max(200).optional(),
  isbn: z.string().trim().max(40).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  publisher: z.string().trim().max(160).nullable().optional(),
  year: z.number().int().min(1400).max(2100).nullable().optional(),
  language: z.string().trim().min(2).max(8).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  coverUrl: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar yaroqsiz" }, { status: 400 });
  }

  const book = await prisma.libraryBook.update({ where: { id }, data: parsed.data });
  return Response.json({ ok: true, data: book });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await params;
  const activeLoans = await prisma.libraryLoan.count({
    where: { copy: { bookId: id }, status: "ACTIVE" },
  });
  if (activeLoans > 0) {
    return Response.json(
      { ok: false, error: "Faol berilgan nusxalar bor — avval ularni qaytaring" },
      { status: 409 },
    );
  }

  await prisma.libraryBook.delete({ where: { id } });
  return Response.json({ ok: true, data: { id } });
}
