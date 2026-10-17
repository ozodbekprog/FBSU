import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCsrfFromRequest } from "@/lib/csrf";

const completionSchema = z.object({
  targetType: z.literal("MATERIAL"),
  targetId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = completionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const material = await prisma.material.findUnique({
    where: { id: parsed.data.targetId },
    select: { id: true },
  });
  if (!material) return Response.json({ ok: false, error: "Material topilmadi" }, { status: 404 });

  await prisma.activityCompletion.upsert({
    where: {
      studentId_targetType_targetId: {
        studentId: user.id,
        targetType: "MATERIAL",
        targetId: material.id,
      },
    },
    create: {
      studentId: user.id,
      targetType: "MATERIAL",
      targetId: material.id,
    },
    update: {},
  });

  return Response.json({ ok: true, data: { completed: true } });
}
