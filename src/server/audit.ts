import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { nextChainFields } from "@/server/audit-chain";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
  sessionId?: string;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const id = randomUUID();
    const createdAt = new Date();
    const actorId = input.actorId ?? null;
    const entity = input.entity ?? null;
    const entityId = input.entityId ?? null;
    const meta = input.meta ?? null;
    let sessionId = input.sessionId ?? null;
    if (!sessionId) {
      try {
        sessionId = (await getSession())?.sid ?? null;
      } catch {
        sessionId = null;
      }
    }
    let chain: { prevHash: string | null; hash: string | null } = { prevHash: null, hash: null };
    try {
      chain = await nextChainFields(prisma, {
        id,
        actorId,
        action: input.action,
        entity,
        entityId,
        meta,
        createdAt,
      });
    } catch {}
    await prisma.auditLog.create({
      data: {
        id,
        actorId,
        action: input.action,
        entity,
        entityId,
        meta: meta === null ? undefined : meta,
        sessionId,
        createdAt,
        prevHash: chain.prevHash,
        hash: chain.hash,
      },
    });
  } catch {}
}
