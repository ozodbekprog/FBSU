import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const CREATOR_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];

const documentInclude = {
  createdBy: { select: { id: true, name: true } },
  signer: { select: { id: true, name: true } },
  signedBy: { select: { id: true, name: true } },
} as const;

const statusSchema = z.enum(["DRAFT", "PENDING", "SIGNED", "REJECTED", "ARCHIVED"]);
const kindSchema = z.enum(["ORDER", "LETTER", "REFERENCE", "PROTOCOL", "OTHER"]);

const createSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(8000),
  signerId: z.string().trim().min(1).nullable().optional(),
  meta: z
    .object({
      studentId: z.string().trim().min(1).optional(),
    })
    .nullable()
    .optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const statusParsed = statusSchema.safeParse(searchParams.get("status"));
  const kindParsed = kindSchema.safeParse(searchParams.get("kind"));

  const documents = await prisma.document.findMany({
    where: {
      status: statusParsed.success ? statusParsed.data : undefined,
      kind: kindParsed.success ? kindParsed.data : undefined,
      NOT: { meta: { path: ["fbsuOffice"], equals: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: documentInclude,
  });

  return Response.json({ ok: true, data: documents });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!CREATOR_ROLES.includes(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  let signerId: string | null = null;
  if (parsed.data.signerId) {
    const signer = await prisma.user.findUnique({
      where: { id: parsed.data.signerId },
      select: { id: true, role: true },
    });
    if (!signer || signer.role === "STUDENT") {
      return Response.json({ ok: false, error: "Imzolovchi topilmadi" }, { status: 400 });
    }
    signerId = signer.id;
  }

  let meta: { studentId: string } | null = null;
  const studentId = parsed.data.meta?.studentId;
  if (studentId) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== "STUDENT") {
      return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 400 });
    }
    meta = { studentId: student.id };
  }

  const document = await prisma.document.create({
    data: {
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      signerId,
      ...(meta ? { meta } : {}),
      createdById: user.id,
    },
    include: documentInclude,
  });

  return Response.json({ ok: true, data: document }, { status: 201 });
}
