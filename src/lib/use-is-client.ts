"use client";

/**
 * Komponent faqat brauzerda (client) render qilinganini aniqlaydi.
 *
 * Nima uchun kerak: `createPortal(..., document.body)` server render
 * paytida ishlaydi va `document` mavjud bo'lmaydi — bu hydration
 * mos kelishmovchiligiga (mismatch) va server xatosiga olib keladi.
 *
 * Nima uchun `useState(true)` emas: `useState` **massiv** qaytaradi
 * (`[true]`), u doim "truthy" bo'ladi — ya'ni hech qachon server va
 * client render'ini farqlamaydi. `useSyncExternalStore` esa uchinchi
 * (`getServerSnapshot`) argument orqali serverda `false` qaytaradi,
 * shuning uchun to'g'ri ishlaydi va `setState-in-effect` qoidasi ham
 * qo'zg'atilmaydi.
 */
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // brauzerda
    () => false, // serverda — portal render qilinmaydi
  );
}