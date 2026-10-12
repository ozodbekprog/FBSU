import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const publicationPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    kind: z.enum(["ARTICLE", "CONFERENCE", "MONOGRAPH", "PATENT", "TEXTBOOK"]),
    status: z.enum(["DRAFT", "SUBMITTED", "PUBLISHED"]),
    indexing: z.enum(["NONE", "SCOPUS", "WOS", "RINC", "LOCAL"]),
    authors: z.string().trim().max(300),
    journal: z.string().trim().max(200),
    year: z.number().int().min(1900).max(2100),
    doi: z.string().trim().max(100),
    url: z.string().trim().max(500),
    note: z.string().trim().max(1000),
  })
  .partial();

async function loadPublication(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null as null };
  }
  const publication = await prisma.publication.findUnique({ where: { id } });
  if (!publication) {
    return { user, publication: null as null };
  }
  if (publication.userId !== user.id && user.role !== "ADMIN") {
    return { user, publication, forbidden: true as const };
  }
  return { user, publication };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await loadPublication(id);
  if (!result.user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!result.publication) {
    return Response.json({ ok: false, error: "Ilmiy ish topilmadi" }, { status: 404 });
  }
  if ("forbidden" in result && result.forbidden) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = publicationPatchSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const updated = await prisma.publication.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await loadPublication(id);
  if (!result.user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!result.publication) {
    return Response.json({ ok: false, error: "Ilmiy ish topilmadi" }, { status: 404 });
  }
  if ("forbidden" in result && result.forbidden) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.publication.delete({ where: { id } });

  return Response.json({ ok: true, data: { id } });
}
