import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "REGISTER"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_SUCCESS"
  | "PASSWORD_RESET_FAILED"
  | "USER_CREATE"
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
  | "CALL_END";

type JsonValue = string | number | boolean | { [key: string]: JsonValue } | JsonValue[] | null;

export interface AuditLogData {
  action: AuditAction;
  entity?: string;
  entityId?: string;
  meta?: Record<string, JsonValue>;
  ip?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const user = await getCurrentUser();
    const meta: Record<string, JsonValue> = {
      ...(data.meta as Record<string, JsonValue>),
      ip: data.ip ?? "unknown",
      userAgent: data.userAgent ?? "unknown",
    };
    await prisma.auditLog.create({
      data: {
        actorId: user?.id || null,
        action: data.action,
        entity: data.entity || null,
        entityId: data.entityId || null,
        meta,
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