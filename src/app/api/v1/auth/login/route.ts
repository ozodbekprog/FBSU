import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateApiToken, hashApiToken } from "@/modules/api-auth/token";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const TOKEN_TTL_MS = 90 * 24 * 3600 * 1000;
const MAX_TOKENS_PER_USER = 5;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) {
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return Response.json({ ok: false, error: "Email yoki parol xato" }, { status: 401 });
  }

  const raw = generateApiToken();
  await prisma.apiToken.create({
    data: {
      userId: user.id,
      tokenHash: hashApiToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const stale = await prisma.apiToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip: MAX_TOKENS_PER_USER,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.apiToken.deleteMany({ where: { id: { in: stale.map((token) => token.id) } } });
  }

  return Response.json({
    ok: true,
    data: {
      token: raw,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
}
