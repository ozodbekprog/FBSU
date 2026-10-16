import "server-only";
import type { Prisma } from "@prisma/client";
import { logAudit } from "@/server/audit";
import type { EventName } from "./catalog";

export type EventContext = {
  entity?: string | null;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
};

export async function recordEvent(
  actorId: string | null,
  event: EventName,
  context: EventContext = {},
): Promise<void> {
  await logAudit({
    actorId,
    action: event,
    entity: context.entity ?? null,
    entityId: context.entityId ?? null,
    meta: context.meta,
  });
}
