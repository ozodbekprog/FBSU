import { z } from "zod";
import { Prisma, type DocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const documentInclude = {
  createdBy: { select: { id: true, name: true } },
  signer: { select: { id: true, name: true } },
  signedBy: { select: { id: true, name: true } },
} as const;

const NUMBER_PREFIX: Record<DocumentKind, string> = {
  ORDER: "BUY",
  LETTER: "XAT",
  REFERENCE: "MAL",
  PROTOCOL: "BAY",
  OTHER: "HJJ",
};

const patchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  body: z.string().trim().min(3).max(8000).optional(),
  signerId: z.string().trim().min(1).nullable().optional(),
  action: z.enum(["submit", "sign", "reject", "archive", "reopen"]).optional(),
});

type Action = NonNullable<z.infer<typeof patchSchema>["action"]>;

async function resolveSigner(id: string): Promise<string | null> {
  const signer = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!signer || signer.role === "STUDENT") return null;
  return signer.id;
}

async function runAction(action: Action, documentId: string, input: z.infer<typeof patchSchema>, userId: string, role: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return Response.json({ ok: false, error: "Hujjat topilmadi" }, { status: 404 });

  const isManager = role === "ADMIN" || role === "REGISTRAR";
  const isCreator = document.createdById === userId;

  if (action === "submit") {
    if (document.status !== "DRAFT" && document.status !== "REJECTED") {
      return Response.json({ ok: false, error: "Hujjat holati imzoga yuborishga mos emas" }, { status: 400 });
    }
    if (!isCreator && !isManager) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    let signerId = document.signerId;
    if (input.signerId !== undefined) {
      if (input.signerId === null) {
        signerId = null;
      } else {
        const resolved = await resolveSigner(input.signerId);
        if (!resolved) {
          return Response.json({ ok: false, error: "Imzolovchi topilmadi" }, { status: 400 });
        }
        signerId = resolved;
      }
    }
    if (!signerId) {
      return Response.json({ ok: false, error: "Avval imzolovchi tanlanadi" }, { status: 400 });
    }
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { status: "PENDING", signerId },
      include: documentInclude,
    });
    return Response.json({ ok: true, data: updated });
  }

  if (action === "sign") {
    if (document.status !== "PENDING") {
      return Response.json({ ok: false, error: "Hujjat imzolashga tayyor emas" }, { status: 400 });
    }
    if (userId !== document.signerId && role !== "ADMIN") {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const year = new Date().getFullYear();
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));
    let seq =
      (await prisma.document.count({
        where: { kind: document.kind, status: "SIGNED", signedAt: { gte: from, lt: to } },
      })) + 1;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const number = `${NUMBER_PREFIX[document.kind]}-${year}-${String(seq).padStart(3, "0")}`;
      try {
        const updated = await prisma.document.update({
          where: { id: documentId },
          data: { status: "SIGNED", number, signedAt: new Date(), signedById: userId },
          include: documentInclude,
        });
        return Response.json({ ok: true, data: updated });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          if (attempt < 3) {
            seq += 1;
            continue;
          }
          return Response.json({ ok: false, error: "Hujjat raqamini yaratishda xatolik" }, { status: 409 });
        }
        throw error;
      }
    }
    return Response.json({ ok: false, error: "Hujjat raqamini yaratishda xatolik" }, { status: 409 });
  }

  if (action === "reject") {
    if (document.status !== "PENDING") {
      return Response.json({ ok: false, error: "Hujjat rad etishga tayyor emas" }, { status: 400 });
    }
    if (userId !== document.signerId && role !== "ADMIN") {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { status: "REJECTED" },
      include: documentInclude,
    });
    return Response.json({ ok: true, data: updated });
  }

  if (action === "archive") {
    if (!isManager) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (document.status !== "SIGNED") {
      return Response.json({ ok: false, error: "Faqat imzolangan hujjat arxivlanadi" }, { status: 400 });
    }
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { status: "ARCHIVED", archivedAt: new Date() },
      include: documentInclude,
    });
    return Response.json({ ok: true, data: updated });
  }

  if (!isCreator && !isManager) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (document.status !== "REJECTED") {
    return Response.json({ ok: false, error: "Faqat rad etilgan hujjat qayta ochiladi" }, { status: 400 });
  }
  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { status: "DRAFT" },
    include: documentInclude,
  });
  return Response.json({ ok: true, data: updated });
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const document = await prisma.document.findUnique({ where: { id }, include: documentInclude });
  if (!document) return Response.json({ ok: false, error: "Hujjat topilmadi" }, { status: 404 });

  return Response.json({ ok: true, data: document });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const payload = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  if (parsed.data.action) {
    return runAction(parsed.data.action, id, parsed.data, user.id, user.role);
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return Response.json({ ok: false, error: "Hujjat topilmadi" }, { status: 404 });

  const isManager = user.role === "ADMIN" || user.role === "REGISTRAR";
  const isCreator = document.createdById === user.id;
  const hasFieldEdit =
    parsed.data.title !== undefined || parsed.data.body !== undefined || parsed.data.signerId !== undefined;

  if (!hasFieldEdit) {
    return Response.json({ ok: false, error: "Amal ko'rsatilmagan" }, { status: 400 });
  }
  if (document.status !== "DRAFT") {
    return Response.json({ ok: false, error: "Faqat qoralama tahrirlanadi" }, { status: 400 });
  }
  if (!isCreator && !isManager) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let signerId: string | null | undefined = undefined;
  if (parsed.data.signerId !== undefined) {
    if (parsed.data.signerId === null) {
      signerId = null;
    } else {
      const resolved = await resolveSigner(parsed.data.signerId);
      if (!resolved) {
        return Response.json({ ok: false, error: "Imzolovchi topilmadi" }, { status: 400 });
      }
      signerId = resolved;
    }
  }

  const updated = await prisma.document.update({
    where: { id },
    data: { title: parsed.data.title, body: parsed.data.body, signerId },
    include: documentInclude,
  });

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role === "STUDENT") return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return Response.json({ ok: false, error: "Hujjat topilmadi" }, { status: 404 });

  if (document.status !== "DRAFT") {
    return Response.json({ ok: false, error: "Faqat qoralama o'chiriladi" }, { status: 400 });
  }
  if (document.createdById !== user.id && user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });

  return Response.json({ ok: true, data: { id } });
}
