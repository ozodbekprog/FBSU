"use client";

/**
 * Ovozli xabar tezligi (Telegram uslubidagi boshqaruv).
 *
 * Tanlangan tezlik `localStorage` da saqlanadi — shuning uchun boshqa
 * xabarlar va keyingi ochilishda ham xuddi shu tezlik qo'llanadi
 * (Telegram'dagi kabi).
 *
 * Qiymat o'qish **ishga tushirilish paytida** emas, `play()` chaqirilganda
 * bajariladi: shu sababli server render'i bilan mijoz render'i farq
 * qilmaydi va `set-state-in-effect` xatosi kelmaydi.
 */

export const MIN_RATE = 0.5;
export const MAX_RATE = 2;
export const RATE_STEP = 0.1;

const STORAGE_KEY = "ttpu-voice-rate";

/** Telegram'dagi taklif etilgan tezliklar. */
export const RATE_PRESETS = [
  { rate: 0.5, labelKey: "msgSpeedSlow" },
  { rate: 1, labelKey: "msgSpeedNormal" },
  { rate: 1.2, labelKey: "msgSpeedMedium" },
  { rate: 1.5, labelKey: "msgSpeedFast" },
  { rate: 1.7, labelKey: "msgSpeedVeryFast" },
  { rate: 2, labelKey: "msgSpeedSuperFast" },
] as const;

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const clamped = Math.min(MAX_RATE, Math.max(MIN_RATE, value));
  return Math.round(clamped * 10) / 10;
}

export function readStoredRate(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 1;
    return clampRate(Number.parseFloat(raw));
  } catch {
    // localStorage basshi to'ldirilgan bo'lishi mumkin (maxfiy rejim)
    return 1;
  }
}

export function storeRate(rate: number): number {
  const safe = clampRate(rate);
  if (typeof window === "undefined") return safe;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(safe));
  } catch {
    // Yozib bo'lmasa ham joriy ijro davom etadi.
  }
  return safe;
}

/** "1" -> "1.0×", "1.25" -> "1.3×" — har doim bir xonali. */
export function formatRate(rate: number): string {
  return `${rate.toFixed(1)}×`;
}