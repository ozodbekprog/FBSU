import { z } from "zod";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { analyzeBug } from "@/lib/ai";

const reportSchema = z.object({
  message: z.string().trim().min(3).max(3000),
  stack: z.string().trim().max(8000).optional(),
  url: z.string().trim().max(600).optional(),
  note: z.string().trim().max(1500).optional(),
  attachment: z
    .string()
    .trim()
    .max(4_500_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});

const IMAGE_EXTENSIONS: Record<string, string> = { png: "png", jpeg: "jpg", webp: "webp" };

function matchesImageSignature(extension: string, buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (extension === "png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (extension === "jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (extension === "webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

async function saveAttachment(dataUrl: string): Promise<string | null> {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const extension = IMAGE_EXTENSIONS[match[1]];
  if (!extension) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > 3_500_000) return null;
  if (!matchesImageSignature(extension, buffer)) return null;
  const baseDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "uploads");
  await mkdir(baseDir, { recursive: true });
  const fileName = `bug-${randomUUID().replace(/-/g, "")}.${extension}`;
  await writeFile(path.join(baseDir, fileName), buffer);
  return `/api/uploads/${fileName}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await verifyCsrfFromRequest(request))) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar to'g'ri emas" }, { status: 400 });
  }

  const clientInfo = getClientInfo(request);
  const rateLimit = await checkRateLimit(`bugs:${user.id}`, {
    windowMs: 60 * 60 * 1000,
    maxAttempts: 10,
    keyPrefix: "bugs",
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Juda ko'p murojaat. Keyinroq urinib ko'ring" },
      { status: 429 },
    );
  }

  const attachmentUrl = parsed.data.attachment
    ? await saveAttachment(parsed.data.attachment).catch(() => null)
    : null;

  const report = await prisma.bugReport.create({
    data: {
      userId: user.id,
      url: parsed.data.url ?? null,
      message: parsed.data.message,
      stack: parsed.data.stack ?? null,
      meta: {
        note: parsed.data.note ?? null,
        attachment: attachmentUrl,
        userName: user.name,
        userRole: user.role,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      },
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Yangi xatolik xabari",
        body: parsed.data.message.slice(0, 180),
        link: "/admin/bugs",
      })),
    });
  }

  await createAuditLog({
    action: "BUG_REPORTED",
    entity: "BugReport",
    entityId: report.id,
    meta: { url: parsed.data.url ?? null, role: user.role },
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  void analyzeBug({
    message: parsed.data.message,
    stack: parsed.data.stack,
    url: parsed.data.url,
  })
    .then(async (analysis) => {
      if (!analysis) return;
      await prisma.bugReport.update({
        where: { id: report.id },
        data: {
          meta: {
            ...((report.meta ?? {}) as Record<string, unknown>),
            ai: analysis,
          },
        },
      });
    })
    .catch(() => {});

  return Response.json({ ok: true, data: { id: report.id } }, { status: 201 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, role: true, email: true } } },
  });

  return Response.json({ ok: true, data: { reports } });
}
