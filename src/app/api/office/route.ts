import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import {
  createOfficeBody,
  isOfficeMeta,
  type OfficeSummary,
  type OfficeType,
} from "@/lib/office";

const createSchema = z.object({
  type: z.enum(["word", "sheets", "slides"]),
  title: z.string().trim().min(1).max(200).optional(),
});

const DEFAULT_TITLES: Record<OfficeType, string> = {
  word: "Yangi hujjat",
  sheets: "Yangi jadval",
  slides: "Yangi taqdimot",
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.document.findMany({
    where: {
      kind: "OTHER",
      meta: { path: ["fbsuOffice"], equals: true },
      ...(user.role === "ADMIN" ? {} : { createdById: user.id }),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      meta: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const items: OfficeSummary[] = [];
  for (const document of documents) {
    if (!isOfficeMeta(document.meta)) continue;
    items.push({
      id: document.id,
      title: document.title,
      type: document.meta.officeType,
      updatedAt: document.updatedAt.toISOString(),
      author: document.createdBy.name,
    });
  }

  return Response.json({ ok: true, data: items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const type = parsed.data.type;
  const document = await prisma.document.create({
    data: {
      kind: "OTHER",
      title: parsed.data.title ?? DEFAULT_TITLES[type],
      body: JSON.stringify(createOfficeBody(type)),
      meta: { fbsuOffice: true, officeType: type },
      createdById: user.id,
    },
    select: {
      id: true,
      title: true,
      meta: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const item: OfficeSummary = {
    id: document.id,
    title: document.title,
    type,
    updatedAt: document.updatedAt.toISOString(),
    author: document.createdBy.name,
  };

  return Response.json({ ok: true, data: item }, { status: 201 });
}
