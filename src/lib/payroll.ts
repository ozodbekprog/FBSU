import "server-only";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Oylik moduli uchun umumiy yordamchilar.
 *
 * Barcha summalar butun so'm (`Int`). Kasrlar kerak bo'lmagani uchun
 * yuvish xatosi ham yo'q.
 */

/** Oylik summalari chegarasi (so'm). Juda katta qiymat kiritilishining oldini oladi. */
export const SALARY_MIN = 0;
export const SALARY_MAX = 500_000_000;

/** Bitta xodimga bir oyda beriladigan ustama chegarasi. */
export const BONUS_MAX = 100_000_000;

/** Baza qanday bo'lishidan qat'i nazar, ro'yxatga solingan rollarni qabul qiladi. */
export const ALL_ROLES: readonly Role[] = [
  "ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR",
  "BUXGALTER", "TYUTOR", "TEACHER", "STUDENT", "XODIM", "OTA_ONA",
] as const;

/**
 * Oylikni ko'rish ruxsati berilishi mumkin bo'lgan rollar.
 *
 * Faqat **rahbariyat**: rektor, prorektor va dekan. Bular rahbariy
 * hisobotlarni ko'rish uchun oylikka ehtiyoj duydi.
 *
 * Boshqa rollar (kafedra mudiri, o'quv bo'limi, tyutor, o'qituvchi,
 * talaba, ota-ona, oddiy xodim) ro'yxatga kiritilmagan. Bu ro'yxat
 * **server tomonda** tekshiriladi (API marshrutida), shuning uchun
 * so'rovni tahrirlab yuborish ro'yxatdan o'tkaza olmaydi. `ADMIN` ham,
 * `BUXGALTER` ham `canViewSalary()` da doim ruxsat oladi.
 */
export const SALARY_GRANTABLE_ROLES: readonly Role[] = [
  "REKTOR", "PRO_RECTOR", "DEKAN",
] as const;

/** Rolni tekshiradi — baza yoki so'rovdan kelgan qiymat haqiqiy rol bo'lishi kerak. */
export function isKnownRole(value: unknown): value is Role {
  return typeof value === "string" && (ALL_ROLES as readonly string[]).includes(value);
}

/** Bu rolga oylikni ko'rish ruxsati berilishi mumkinmi. */
export function isGrantableRole(value: unknown): value is Role {
  return isKnownRole(value) && (SALARY_GRANTABLE_ROLES as readonly string[]).includes(value);
}

/** JS `Date` ni oy boshi (UTC 00:00) ga tekislaydi. */
export function monthStart(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Oy boshi sanasini `YYYY-MM` formatida. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Butun so'mni `1 234 567` ko'rinishida qaytaradi (NUQTA bilan ajratilgan). */
export function formatSum(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

/** `480` → `08:00` */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `08:00` → `480` */
export function clockToMinutes(clock: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Hafta kuni nomlari (0 = Yakshanba). */
export const WEEKDAYS_UZ = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba",
] as const;

/** Summani tekshiradi: butun son, chegarada. Xato bo'lsa xabar qaytaradi. */
export function validateAmount(
  value: unknown,
  label: string,
  max = SALARY_MAX,
): { ok: true; value: number } | { ok: false; error: string } {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return { ok: false, error: `${label}: son bo'lishi kerak` };
  }
  if (!Number.isInteger(n)) {
    return { ok: false, error: `${label}: butun so'm kiriting (kasr qabul qilinmaydi)` };
  }
  if (n < SALARY_MIN || n > max) {
    return { ok: false, error: `${label}: ${SALARY_MIN}..${max} orasida bo'lishi kerak` };
  }
  return { ok: true, value: n };
}

/**
 * Fakultet/kafedra kesimida oylik jami.
 *
 * `byGroup` — bo'lim nomi bo'yicha guruhlangan jami,
 * `unassigned` — bo'limi yo'q xodimlar jami (yashirib qo'yilmaydi,
 * chunki real hisobotda ko'rinishi kerak).
 */
export type SalaryTotals = {
  byGroup: Array<{ group: string; count: number; total: number }>;
  unassigned: { count: number; total: number };
  grandTotal: number;
  totalCount: number;
};

/** Bir oy uchun bo'limlar kesimida oylik jami. FAQAT ko'rish ruxsati bo'lganlar uchun. */
export async function salaryTotalsForMonth(month: Date): Promise<SalaryTotals> {
  const from = monthStart(month);
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));

  const rows = await prisma.salaryRecord.findMany({
    where: {
      month: { gte: from, lt: to },
      // Tasdiqlanmagan (DRAFT) yozuvlar hisobotga tushmasin.
      status: { not: "DRAFT" },
    },
    select: {
      total: true,
      user: {
        select: {
          department: { select: { name: true } },
        },
      },
    },
  });

  const map = new Map<string, { count: number; total: number }>();
  const unassigned = { count: 0, total: 0 };
  let grandTotal = 0;

  for (const row of rows) {
    grandTotal += row.total;
    const name = row.user.department?.name;
    if (!name) {
      unassigned.count += 1;
      unassigned.total += row.total;
      continue;
    }
    const entry = map.get(name) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += row.total;
    map.set(name, entry);
  }

  return {
    byGroup: [...map.entries()]
      .map(([group, v]) => ({ group, ...v }))
      .sort((a, b) => b.total - a.total),
    unassigned,
    grandTotal,
    totalCount: rows.length,
  };
}