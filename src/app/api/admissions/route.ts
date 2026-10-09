import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIpFromHeaders } from "@/modules/attendance-security/verify";
import { ADMISSION_MANAGE_ROLES, ADMISSION_VIEW_ROLES } from "./shared";

const statusSchema = z.enum(["NEW", "DOCUMENTS", "EXAM", "PASSED", "REJECTED", "ENROLLED"]);

const createSchema = z.object({
  applicantName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(160).nullable().optional(),
  school: z.string().trim().max(160).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  programId: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!ADMISSION_VIEW_ROLES.includes(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParsed = statusSchema.safeParse(searchParams.get("status"));
  const query = (searchParams.get("q") ?? "").trim();

  const applications = await prisma.admissionApplication.findMany({
    where: {
      status: statusParsed.success ? statusParsed.data : undefined,
      ...(query
        ? {
            OR: [
              { applicantName: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query } },
              { email: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      program: { select: { id: true, name: true } },
      student: { select: { id: true, name: true } },
    },
  });

  return Response.json({ ok: true, data: applications });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (user) {
    if (!ADMISSION_MANAGE_ROLES.includes(user.role)) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const csrfValid = await verifyCsrfFromRequest(request);
    if (!csrfValid) {
      return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
    }
  } else {
    const ip = clientIpFromHeaders(request.headers) ?? "local";
    const rateLimit = await checkRateLimit(`apply:${ip}`, {
      windowMs: 3_600_000,
      maxAttempts: 5,
      keyPrefix: "api",
    });
    if (!rateLimit.allowed) {
      return Response.json(
        { ok: false, error: "Juda ko'p ariza. Keyinroq qayta urinib ko'ring" },
        { status: 429 },
      );
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ariza ma'lumotlari to'liq emas" }, { status: 400 });
  }

  const program = await prisma.admissionProgram.findUnique({
    where: { id: parsed.data.programId },
    select: { id: true, isActive: true },
  });
  if (!program || !program.isActive) {
    return Response.json({ ok: false, error: "Yo'nalish topilmadi" }, { status: 400 });
  }

  const application = await prisma.admissionApplication.create({
    data: {
      programId: program.id,
      applicantName: parsed.data.applicantName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      school: parsed.data.school || null,
      note: parsed.data.note || null,
    },
    include: { program: { select: { id: true, name: true } } },
  });

  return Response.json({ ok: true, data: application }, { status: 201 });
}
