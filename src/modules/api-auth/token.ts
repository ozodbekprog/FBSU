import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "fbsu_";

export function generateApiToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("hex")}`;
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function unauthorized() {
  return {
    ok: false as const,
    response: Response.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
  };
}

export async function requireApiToken(
  request: Request,
): Promise<{ ok: true; user: User } | { ok: false; response: Response }> {
  const header = request.headers.get("authorization");
  if (!header) return unauthorized();

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return unauthorized();

  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(match[1]) },
    include: { user: true },
  });
  if (!record) return unauthorized();
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) return unauthorized();
  if (!record.user.isActive) return unauthorized();

  await prisma.apiToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { ok: true, user: record.user };
}
