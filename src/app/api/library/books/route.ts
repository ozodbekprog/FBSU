import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";
import { getCatalog } from "@/server/library";

const bookSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(200),
  isbn: z.string().trim().max(40).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  publisher: z.string().trim().max(160).optional().nullable(),
  year: z.number().int().min(1400).max(2100).optional().nullable(),
  language: z.string().trim().min(2).max(8).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  copies: z.number().int().min(0).max(500).optional(),
  shelf: z.string().trim().max(40).optional().nullable(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const data = await getCatalog(query);
  return Response.json({ ok: true, data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const parsed = bookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Kitob ma'lumotlari to'liq emas" }, { status: 400 });
  }

  const { copies = 0, shelf, ...book } = parsed.data;
  const created = await prisma.libraryBook.create({
    data: {
      ...book,
      isbn: book.isbn || null,
      category: book.category || null,
      publisher: book.publisher || null,
      description: book.description || null,
      copies: {
        create: Array.from({ length: copies }, (_, index) => ({
          inventoryNo: `${Date.now().toString(36)}-${index + 1}`,
          shelf: shelf || null,
        })),
      },
    },
    include: { copies: { select: { id: true } } },
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}
