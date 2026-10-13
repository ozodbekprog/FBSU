"use client";

/**
 * Service worker bilan kichik ko'prik (bridge).
 *
 * Service worker'ga odatda faqat `postMessage` orqali murojaat qilinsa,
 * javobni olish uchun `MessageChannel` kerak. Bu yordamchi funksiya
 * ikkalasini yopadi va SW yo'q holatda (dev rejim, eskirgan brauzer)
 * jimgina `false` qaytaradi — hech qanday xato chiqmaydi.
 */

/** Berilgan service worker'ga xabar yuborib, javobni kutadi. */
export function askServiceWorker(message: unknown, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      resolve(false);
      return;
    }
    const worker = navigator.serviceWorker.controller;
    if (!worker) {
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    try {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        clearTimeout(timer);
        finish(true);
      };
      worker.postMessage(message, [channel.port2]);
    } catch {
      clearTimeout(timer);
      finish(false);
    }
  });
}

/**
 * Barcha oflayn keshlarni tozalaydi.
 *
 * Chiqish paytida **majburiy** chaqiriladi: kesh foydalanuvchilararo
 * umumiy bo'lgani uchun, tozalanmasa keyingi foydalanuvchi tarmoq
 * yo'q holatda avvalgisining ma'lumotlarini ko'ra oladi.
 *
 * SW javob bermasa (yo'q/ishlamayapti) — barcha `ttpu-lms-` keshlari
 * to'g'ridan-to'g'ri o'chiramiz.
 */
export async function clearOfflineCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;

  const clearedByWorker = await askServiceWorker({ type: "CLEAR_CACHES" });
  if (clearedByWorker) return;

  try {
    const keys = await window.caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("ttpu-lms-")).map((key) => window.caches.delete(key)));
  } catch {
    // Keshni tozalab bo'lmasa ham chiqish davom etadi — bu xavfsizlik
    // qulayligi, chiqishni bloklamaslik kerak.
  }
}