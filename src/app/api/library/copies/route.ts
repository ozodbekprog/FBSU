import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { hasCapability } from "@/modules/capabilities";

const copySchema = z.object({
  bookId: z.string().trim().min(1),
  inventoryNo: z.string().trim().min(1).max(60),
  shelf: z.string().trim().max(40).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "library.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const parsed = copySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Inventar raqami kerak" }, { status: 400 });
  }

  const exists = await prisma.libraryCopy.findUnique({
    where: { inventoryNo: parsed.data.inventoryNo },
    select: { id: true },
  });
  if (exists) {
    return Response.json({ ok: false, error: "Bu inventar raqami band" }, { status: 409 });
  }

  const copy = await prisma.libraryCopy.create({
    data: {
      bookId: parsed.data.bookId,
      inventoryNo: parsed.data.inventoryNo,
      shelf: parsed.data.shelf || null,
    },
  });

  return Response.json({ ok: true, data: copy }, { status: 201 });
}
