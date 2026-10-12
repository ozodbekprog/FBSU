"use client";

import { useSyncExternalStore } from "react";

/**
 * Tarmoq holati.
 *
 * `navigator.onLine` faqat "tarmoqga ulanganmi" degan cheklovni bildiradi —
 * u haqiqiy internet bor-yo'qligini bilmaydi. Shuning uchun biz
 * `online`/`offline` hodisalarini obuna bo'lamiz va `true` dan boshlab
 * optimistik qolamiz (yo'q holatda faqat "oflayn" deb ko'rsatamiz, xato
 * xabar chiqarmaymiz).
 *
 * `useSyncExternalStore` ishlatilishi muhim: bu tashqi holat (brauzer API)
 * bilan sinxronlash uchun mo'ljallangan va server render'ida ham xato
 * ber maydi — oddiy `useEffect` + `setState` esa "cascading render"
 * keltirib chiqaradi.
 */
function subscribe(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// Serverda `navigator` yo'q — xavfsiz default.
const getServerSnapshot = () => true;

export type NetworkState = {
  online: boolean;
  /** true → tarmoq yo'q deb aniqlandi */
  offline: boolean;
};

export function useNetworkState(): NetworkState {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { online, offline: !online };
}