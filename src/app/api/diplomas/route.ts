import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { recordEvent } from "@/modules/events/record";
import { hasCapability } from "@/modules/capabilities";

const createSchema = z.object({
  studentId: z.string().trim().min(1),
  program: z.string().trim().min(3).max(120),
  degree: z.string().trim().min(3).max(40).optional(),
  gpa: z.number().min(0).max(4).nullable().optional(),
});

const diplomaInclude = {
  student: { select: { id: true, name: true, group: { select: { name: true } } } },
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  if (user.role === "STUDENT") {
    const diplomas = await prisma.diploma.findMany({
      where: { studentId: user.id },
      orderBy: { issuedAt: "desc" },
      include: diplomaInclude,
    });
    return Response.json({ ok: true, data: diplomas });
  }

  if (!hasCapability(user.role, "diplomas.view")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const diplomas = await prisma.diploma.findMany({
    orderBy: { issuedAt: "desc" },
    include: diplomaInclude,
  });

  return Response.json({ ok: true, data: diplomas });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!hasCapability(user.role, "academic.manage")) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar to'liq emas" }, { status: 400 });
  }

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Talaba topilmadi" }, { status: 404 });
  }

  const prefix = `DIP-${new Date().getFullYear()}-`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const yearCount = await prisma.diploma.count({
        where: { number: { startsWith: prefix } },
      });
      const diploma = await prisma.diploma.create({
        data: {
          number: `${prefix}${String(yearCount + 1).padStart(3, "0")}`,
          verifyCode: randomBytes(6).toString("hex"),
          studentId: student.id,
          program: parsed.data.program,
          degree: parsed.data.degree ?? "Bakalavr",
          gpa: parsed.data.gpa ?? null,
        },
        include: diplomaInclude,
      });

      await recordEvent(user.id, "diploma.create", {
        entity: "Diploma",
        entityId: diploma.id,
        meta: { number: diploma.number, studentId: student.id },
      });

      return Response.json({ ok: true, data: diploma }, { status: 201 });
    } catch (error) {
      const isUnique =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (isUnique && attempt < 2) continue;
      return Response.json(
        { ok: false, error: "Diplom yaratishda xatolik yuz berdi" },
        { status: isUnique ? 409 : 500 },
      );
    }
  }

  return Response.json({ ok: false, error: "Diplom raqami band" }, { status: 409 });
}
