import type { Role } from "@prisma/client";

export const ADMISSION_VIEW_ROLES: Role[] = ["ADMIN", "REGISTRAR", "REKTOR", "PRO_RECTOR"];
export const ADMISSION_MANAGE_ROLES: Role[] = ["ADMIN", "REGISTRAR"];
