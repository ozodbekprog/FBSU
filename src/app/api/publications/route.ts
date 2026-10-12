import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const publicationSchema = z.object({
  title: z.string().trim().min(1).max(300),
  kind: z.enum(["ARTICLE", "CONFERENCE", "MONOGRAPH", "PATENT", "TEXTBOOK"]).default("ARTICLE" as const),
  status: z.enum(["DRAFT", "SUBMITTED", "PUBLISHED"]).default("DRAFT"),
  indexing: z.enum(["NONE", "SCOPUS", "WOS", "RINC", "LOCAL"]).default("NONE"),
  authors: z.string().trim().max(300).optional(),
  journal: z.string().trim().max(200).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  doi: z.string().trim().max(100).optional(),
  url: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let where: { userId?: string; user?: { departmentId?: string; facultyId?: string } };
  switch (user.role) {
    case "TEACHER":
      where = { userId: user.id };
      break;
    case "ADMIN":
    case "REKTOR":
    case "PRO_RECTOR":
      where = {};
      break;
    case "KAFEDRA_MUDIRI":
      where = { user: { departmentId: user.departmentId ?? "__none__" } };
      break;
    case "DEKAN":
      where = { user: { facultyId: user.facultyId ?? "__none__" } };
      break;
    default:
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.publication.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, department: { select: { name: true } } } },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });

  return Response.json({ ok: true, data: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = publicationSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const created = await prisma.publication.create({
    data: { ...parsed.data, userId: user.id },
  });

  return Response.json({ ok: true, data: created }, { status: 201 });
}
