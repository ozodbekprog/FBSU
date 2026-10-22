import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { ADMISSION_MANAGE_ROLES } from "../shared";

const patchSchema = z.object({
  status: z.enum(["NEW", "DOCUMENTS", "EXAM", "PASSED", "REJECTED", "ENROLLED"]).optional(),
  examScore1: z.number().int().min(0).max(100).nullable().optional(),
  examScore2: z.number().int().min(0).max(100).nullable().optional(),
  interviewScore: z.number().int().min(0).max(100).nullable().optional(),
  decisionNote: z.string().trim().max(1000).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  action: z.enum(["enroll"]).optional(),
});

const TEMP_PASSWORD_LENGTH = 10;
const TEMP_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateTempPassword() {
  const bytes = randomBytes(TEMP_PASSWORD_LENGTH);
  let password = "";
  for (let index = 0; index < TEMP_PASSWORD_LENGTH; index += 1) {
    password += TEMP_PASSWORD_ALPHABET[bytes[index] % TEMP_PASSWORD_ALPHABET.length];
  }
  return password;
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!ADMISSION_MANAGE_ROLES.includes(user.role)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const application = await prisma.admissionApplication.findUnique({ where: { id } });
  if (!application) {
    return Response.json({ ok: false, error: "Ariza topilmadi" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar xato" }, { status: 400 });
  }

  if (parsed.data.action === "enroll") {
    if (application.studentId) {
      return Response.json({ ok: false, error: "Allaqachon talaba qilingan" }, { status: 409 });
    }
    const email = application.email ?? "";
    if (!email) {
      return Response.json(
        { ok: false, error: "Talaba qilish uchun email kerak" },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return Response.json({ ok: false, error: "Bu email allaqachon band" }, { status: 409 });
    }
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const student = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: application.applicantName,
        role: "STUDENT",
      },
      select: { id: true, name: true },
    });
    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: { status: "ENROLLED", studentId: student.id },
      include: { program: { select: { id: true, name: true } }, student: { select: { id: true, name: true } } },
    });
    return Response.json(
      { ok: true, data: { ...updated, tempPassword } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const updated = await prisma.admissionApplication.update({
    where: { id },
    data: {
      status: parsed.data.status,
      examScore1:
        parsed.data.examScore1 === undefined ? undefined : parsed.data.examScore1,
      examScore2:
        parsed.data.examScore2 === undefined ? undefined : parsed.data.examScore2,
      interviewScore:
        parsed.data.interviewScore === undefined ? undefined : parsed.data.interviewScore,
      decisionNote:
        parsed.data.decisionNote === undefined ? undefined : parsed.data.decisionNote || null,
      note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
    },
    include: { program: { select: { id: true, name: true } }, student: { select: { id: true, name: true } } },
  });

  return Response.json({ ok: true, data: updated });
}
