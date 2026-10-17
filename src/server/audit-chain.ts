import "server-only";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type AuditHashInput = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: unknown;
  createdAt: Date;
};

function normalize(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(normalize);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      const item = source[key];
      if (item !== undefined) result[key] = normalize(item);
    }
    return result;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  const encoded = JSON.stringify(normalize(value));
  return encoded === undefined ? "null" : encoded;
}

export function computeAuditHash(input: AuditHashInput & { prevHash: string | null }): string {
  const payload = canonicalJson({
    id: input.id,
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    meta: input.meta,
    createdAt: input.createdAt.toISOString(),
  });
  return createHash("sha256").update(`${input.prevHash ?? ""}|${payload}`).digest("hex");
}

export async function nextChainFields(
  prisma: PrismaClient,
  data: AuditHashInput,
): Promise<{ prevHash: string | null; hash: string }> {
  const last = await prisma.auditLog.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { hash: true },
  });
  const prevHash = last?.hash ?? null;
  const hash = computeAuditHash({
    prevHash,
    id: data.id,
    actorId: data.actorId,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId,
    meta: data.meta,
    createdAt: data.createdAt,
  });
  return { prevHash, hash };
}
