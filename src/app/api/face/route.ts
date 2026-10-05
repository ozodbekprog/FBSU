import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { isValidFaceDescriptor } from "@/modules/attendance/face";

const enrollSchema = z.object({
  descriptor: z.array(z.number().finite()).max(256),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { faceDescriptor: true, faceEnrolledAt: true },
  });
  return Response.json({
    ok: true,
    data: {
      enrolled: isValidFaceDescriptor(row?.faceDescriptor),
      enrolledAt: row?.faceEnrolledAt ?? null,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const parsed = enrollSchema.safeParse(payload);
  if (!parsed.success || !isValidFaceDescriptor(parsed.data.descriptor)) {
    return Response.json({ ok: false, error: "Yuz ma'lumotlari noto'g'ri" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { faceDescriptor: parsed.data.descriptor, faceEnrolledAt: new Date() },
  });
  return Response.json({ ok: true, data: { enrolled: true } });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { faceDescriptor: Prisma.DbNull, faceEnrolledAt: null },
  });
  return Response.json({ ok: true, data: { enrolled: false } });
}
