import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";
import { nextChainFields } from "@/server/audit-chain";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "DEVICE_APPROVAL_REQUEST"
  | "DEVICE_APPROVAL_VERIFIED"
  | "DEVICE_APPROVAL_FAILED"
  | "DEVICE_APPROVAL_SUCCESS"
  | "LOGOUT"
  | "REGISTER"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_SUCCESS"
  | "PASSWORD_RESET_FAILED"
  | "PASSWORD_RESET_EMAIL_FAILED"
  | "USER_CREATE"
  | "CHAT_VOICE_MESSAGE"
  | "CHAT_FILE_MESSAGE"
  | "CHAT_DOWNLOAD_ATTACHMENT"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "ROLE_CHANGE"
  | "SESSION_REVOKED"
  | "FILE_UPLOAD"
  | "FILE_DOWNLOAD"
  | "SETTINGS_CHANGE"
  | "BUG_REPORTED"
  | "BUG_UPDATED"
  // Oylik moduli: moliyaviy harakatlar har doim iz qoldiradi.
  | "SALARY_CREATE"
  | "SALARY_UPDATE"
  | "SALARY_STATUS_CHANGE"
  | "SALARY_DELETE"
  | "SALARY_GRANT"
  | "SALARY_GRANT_REVOKE"
  | "CALL_START"
  | "CALL_RESPOND"
  | "CALL_END"
  | "CHAT_DELETE"
  | "CHAT_CLEAR_HISTORY"
  | "CHAT_BLOCK"
  | "CHAT_UNBLOCK"
  | "CHAT_REPORT"
  | "ANNOUNCEMENT_CREATE"
  | "ANNOUNCEMENT_DELETE"
  | "COURSE_CREATE";

type JsonValue = string | number | boolean | { [key: string]: JsonValue } | JsonValue[] | null;

export interface AuditLogData {
  action: AuditAction;
  actorId?: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, JsonValue>;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const user = await getCurrentUser();
    const meta: Record<string, JsonValue> = {
      ...(data.meta as Record<string, JsonValue>),
      ip: data.ip ?? "unknown",
      userAgent: data.userAgent ?? "unknown",
    };
    const id = randomUUID();
    const createdAt = new Date();
    const actorId = data.actorId ?? user?.id ?? null;
    const entity = data.entity || null;
    const entityId = data.entityId || null;
    let sessionId = data.sessionId ?? null;
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
        action: data.action,
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
        action: data.action,
        entity,
        entityId,
        meta,
        sessionId,
        createdAt,
        prevHash: chain.prevHash,
        hash: chain.hash,
      },
    });
  } catch (error) {
    console.error("Audit log creation failed:", error);
  }
}

export function getClientInfo(request: Request): { ip: string; userAgent: string } {
  const ip = getClientIp(request.headers) ?? "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}