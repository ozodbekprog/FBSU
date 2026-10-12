import "server-only";
import { prisma } from "@/lib/prisma";

const MAINTENANCE_SETTING_KEY = "maintenance_mode";

/**
 * Maintenance rejimi holatini AppSetting jadvalidan o'qiydi.
 * `src/server/settings.ts` dagi `getModuleFlags` uslubiga mos:
 * xatolik yoki yo'lmagan kalit bo'lsa — xavfsiz fallback (false).
 */
export async function getMaintenanceMode(): Promise<boolean> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: MAINTENANCE_SETTING_KEY },
    });
    if (!setting) return false;
    return setting.value === true;
  } catch {
    return false;
  }
}

export async function setMaintenanceMode(enabled: boolean): Promise<boolean> {
  await prisma.appSetting.upsert({
    where: { key: MAINTENANCE_SETTING_KEY },
    create: { key: MAINTENANCE_SETTING_KEY, value: enabled },
    update: { value: enabled },
  });
  return enabled;
}
